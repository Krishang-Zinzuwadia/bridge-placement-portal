import {createClerkClient} from '@clerk/backend';

const fail=(message,status=400,code)=>{throw Object.assign(new Error(message),{status,code});};
function providerAvatar(value){try{const url=new URL(String(value||''));return url.protocol==='https:'&&!url.username&&!url.password&&url.href.length<=2000?url.href:'';}catch{return '';}}
function authIssuer(env){
 try{
  const encoded=String(env.CLERK_PUBLISHABLE_KEY||'').match(/^pk_(?:test|live)_(.+)$/)?.[1];
  if(!encoded)return null;
  const decoded=atob(encoded);
  if(!/^[a-z0-9.-]+\$$/i.test(decoded))return null;
  return new URL('https://'+decoded.slice(0,-1)).origin;
 }catch{return null;}
}
function authorizedParties(env){
 const parties=String(env.CLERK_AUTHORIZED_PARTIES||'').split(',').map(p=>p.trim()).filter(Boolean);
 if(!parties.length)return [];
 try{if(parties.some(p=>new URL(p).origin!==p||!['https:','http:'].includes(new URL(p).protocol)))return [];}catch{return [];}
 return [...new Set(parties)];
}
export function authConfig(env){
 const provider=env.AUTH_MODE==='clerk'?'clerk':'demo';
 return {provider,publishableKey:provider==='clerk'?String(env.CLERK_PUBLISHABLE_KEY||''):'',enabled:provider==='demo'||Boolean(authIssuer(env)&&env.CLERK_SECRET_KEY&&authorizedParties(env).length),uploadsEnabled:Boolean(env.UPLOADS)};
}
function clerk(env){
 if(!authConfig(env).enabled||env.AUTH_MODE!=='clerk')fail('Authentication is not configured.',503,'AUTH_UNAVAILABLE');
 return createClerkClient({publishableKey:env.CLERK_PUBLISHABLE_KEY,secretKey:env.CLERK_SECRET_KEY});
}
export async function verifyClerkIdentity(request,env){
 const client=clerk(env);
 try{
  const verified=await client.authenticateRequest(request,{authorizedParties:authorizedParties(env),acceptsToken:'session_token',...(env.CLERK_JWT_KEY?{jwtKey:env.CLERK_JWT_KEY}:{})});
  if(!verified.isAuthenticated)fail('Unauthorized',401);
  const auth=verified.toAuth();
  if(!auth.userId||!auth.sessionId||auth.sessionClaims?.iss!==authIssuer(env))fail('Unauthorized',401);
  return {userId:auth.userId};
 }catch(e){if(e.status===503)throw e;fail('Unauthorized',401);}
}
export function verifiedProfile(providerUser,subject){
 if(providerUser?.id!==subject)fail('Provider identity does not match this session.',403);
 const email=providerUser.emailAddresses?.find(e=>e.id===providerUser.primaryEmailAddressId);
 if(!email||email.verification?.status!=='verified')fail('Verify your primary email address before continuing.',403,'EMAIL_NOT_VERIFIED');
 const address=String(email.emailAddress||'').trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(address))fail('Verify a valid primary email address before continuing.',403,'EMAIL_NOT_VERIFIED');
 const name=[providerUser.firstName,providerUser.lastName].filter(Boolean).join(' ').trim();
 return {userId:subject,email:address,name:name||providerUser.username||address.split('@')[0],avatarUrl:providerAvatar(providerUser.imageUrl)};
}
export async function providerProfile(env,identity){
 try{return verifiedProfile(await clerk(env).users.getUser(identity.userId),identity.userId);}
 catch(e){if(e.status)throw e;fail('Your identity provider is temporarily unavailable. Please try again.',503,'IDENTITY_UNAVAILABLE');}
}
export async function syncProviderAvatar(db,env,identity,account){
 if(account.avatar_url||account.avatar_source==='upload')return account;
 try{
  const providerUser=await clerk(env).users.getUser(identity.userId);
  if(providerUser.id!==identity.userId)return account;
  const url=providerAvatar(providerUser.imageUrl);if(!url)return account;
  await db.prepare("UPDATE users SET avatar_url=?,avatar_source='provider' WHERE id=? AND avatar_url='' AND avatar_source='provider'").bind(url,account.id).run();
  return await db.prepare('SELECT * FROM users WHERE id=?').bind(account.id).first()||account;
 }catch{return account;}
}
export async function provisionAccount(db,identity,payload){
 const existing=await db.prepare("SELECT * FROM users WHERE clerk_user_id=? AND auth_provider='clerk'").bind(identity.userId).first();
 if(existing)return existing;
 if(!['student','recruiter'].includes(payload.role))fail('Choose a student or recruiter account.');
 if(!identity.userId||!identity.email)fail('A verified identity is required.',403);
 const name=String(payload.name||identity.name||'').trim(),company=String(payload.company||'').trim();
 if(!name||name.length>100)fail('Enter your full name (up to 100 characters).');
 if(payload.role==='recruiter'&&(!company||company.length>100))fail('Enter a company name (up to 100 characters).');
 if(await db.prepare('SELECT id FROM users WHERE email=?').bind(identity.email).first())fail('This email belongs to an existing account. Contact the placement office to resolve it; accounts cannot be linked by email.',409,'ACCOUNT_COLLISION');
 const uid=crypto.randomUUID();
 const statements=[db.prepare("INSERT INTO users(id,name,email,password,salt,role,clerk_user_id,auth_provider,email_verified,avatar_url,avatar_source) VALUES(?,?,?,?,?,?,?,'clerk',1,?,'provider')").bind(uid,name,identity.email,'clerk-managed',crypto.randomUUID(),payload.role,identity.userId,providerAvatar(identity.avatarUrl))];
 if(payload.role==='recruiter')statements.push(db.prepare("INSERT INTO companies(id,owner_id,name,industry,logo,status) VALUES(?,?,?,?,?,'pending')").bind(crypto.randomUUID(),uid,company,'Technology',company[0].toUpperCase()));
 try{await db.batch(statements);}catch(e){
  // A simultaneous retry may already have provisioned the same Clerk subject.
  const created=await db.prepare("SELECT * FROM users WHERE clerk_user_id=? AND auth_provider='clerk'").bind(identity.userId).first();
  if(created)return created;
  if(String(e).includes('UNIQUE'))fail('This email belongs to an existing account. Contact the placement office to resolve it.',409,'ACCOUNT_COLLISION');
  throw e;
 }
 return db.prepare('SELECT * FROM users WHERE id=?').bind(uid).first();
}
