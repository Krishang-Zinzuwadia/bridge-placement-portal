import {normalizeSkills} from './skills.mjs';
import {authorize,eligibility,canTransition} from './rules.mjs';
import {authConfig,verifyClerkIdentity,providerProfile,provisionAccount} from './identity.mjs';
const json=(body,status=200,headers={})=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...headers}});
const error=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const id=()=>crypto.randomUUID();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function hash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
const publicUser=u=>u?Object.fromEntries(Object.entries(u).filter(([k])=>!['password','salt'].includes(k))):null;
const safeUrl=v=>!v||/^https?:\/\/[^\s]+$/i.test(v);
async function session(request,db){const token=request.headers.get('Cookie')?.match(/(?:^|;\s*)cb_session=([^;]+)/)?.[1];if(!token)return null;return db.prepare('SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>?').bind(token,Date.now()).first();}
function cookie(token,request,expire=false){return `cb_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${expire?0:604800}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
async function login(user,request,db){const token=hex(crypto.getRandomValues(new Uint8Array(32)));await db.prepare('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)').bind(token,user.id,Date.now()+604800000).run();return json({user:publicUser(user)},200,{'Set-Cookie':cookie(token,request)});}
async function state(user,db){
 let companies,jobs,applications,students=[],logs=[],saved=[];
 if(user.role==='student'){
  companies=(await db.prepare("SELECT * FROM companies WHERE status='approved'").all()).results;
  jobs=(await db.prepare("SELECT j.*,c.name AS company_name,c.logo,c.color,c.industry FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.status='approved' AND c.status='approved' ORDER BY j.created_at DESC").all()).results;
  applications=(await db.prepare('SELECT a.*,j.title,j.salary,j.type,j.location,j.company_id,c.name AS company_name,c.logo,c.color FROM applications a JOIN jobs j ON a.job_id=j.id JOIN companies c ON c.id=j.company_id WHERE a.student_id=? ORDER BY a.created_at DESC').bind(user.id).all()).results;
  saved=(await db.prepare('SELECT job_id FROM saved_jobs WHERE student_id=?').bind(user.id).all()).results.map(x=>x.job_id);
 }else if(user.role==='recruiter'){
  companies=(await db.prepare('SELECT * FROM companies WHERE owner_id=?').bind(user.id).all()).results;
  jobs=(await db.prepare('SELECT j.*,c.name AS company_name,c.logo,c.color FROM jobs j JOIN companies c ON c.id=j.company_id WHERE c.owner_id=? ORDER BY j.created_at DESC').bind(user.id).all()).results;
  applications=(await db.prepare('SELECT a.*,j.title,c.name AS company_name,c.logo,c.color,u.name AS student_name,u.email AS student_email FROM applications a JOIN jobs j ON a.job_id=j.id JOIN companies c ON c.id=j.company_id JOIN users u ON a.student_id=u.id WHERE c.owner_id=? ORDER BY a.created_at DESC').bind(user.id).all()).results;
 }else{
  companies=(await db.prepare('SELECT c.*,u.name AS owner_name,u.email AS owner_email FROM companies c JOIN users u ON c.owner_id=u.id ORDER BY c.created_at DESC').all()).results;
  jobs=(await db.prepare('SELECT j.*,c.name AS company_name,c.logo,c.color,c.status AS company_status FROM jobs j JOIN companies c ON c.id=j.company_id ORDER BY j.created_at DESC').all()).results;
  applications=(await db.prepare('SELECT a.*,j.title,c.name AS company_name,c.logo,c.color,u.name AS student_name FROM applications a JOIN jobs j ON a.job_id=j.id JOIN companies c ON c.id=j.company_id JOIN users u ON u.id=a.student_id ORDER BY a.created_at DESC').all()).results;
  students=(await db.prepare("SELECT id,name,email,department,cgpa,graduation_year FROM users WHERE role='student'").all()).results;
  logs=(await db.prepare('SELECT l.*,u.name AS reviewer_name,COALESCE(c.name,j.title) AS target_name FROM audit_logs l JOIN users u ON l.reviewer_id=u.id LEFT JOIN companies c ON l.target_type=\'company\' AND c.id=l.target_id LEFT JOIN jobs j ON l.target_type=\'job\' AND j.id=l.target_id ORDER BY l.created_at DESC').all()).results;
 }
 return {user:publicUser(user),companies,jobs,applications,students,logs,saved};
}
async function api(request,env){
 const db=env.DB,url=new URL(request.url),path=url.pathname,method=request.method;
 if(path==='/api/auth/config'&&method==='GET')return json(authConfig(env));
 if(!db)error('Database is unavailable. Apply migrations and seed the database.',503);
 if(!['GET','HEAD'].includes(method)){
  const origin=request.headers.get('Origin');const local=['127.0.0.1','localhost'].includes(url.hostname);
  if(origin&&origin!==url.origin&&!(local&&['127.0.0.1','localhost'].includes(new URL(origin).hostname)))error('Request origin is not allowed.',403);
  if(Number(request.headers.get('Content-Length'))>40000)error('Request is too large.',413);
 }
 // Clerk's request adapter needs the original stream; parse a clone for mutations.
 const body=['GET','HEAD'].includes(method)||!request.body?{}:await request.clone().json().catch(()=>error('Send a valid JSON object.'));
 if(!body||typeof body!=='object'||Array.isArray(body))error('Send a valid JSON object.');
 const usesClerk=env.AUTH_MODE==='clerk';
 if(usesClerk&&['/api/login','/api/signup','/api/logout'].includes(path))error('Use Clerk to sign in, create an account or sign out.',409);
 if(path==='/api/login'&&method==='POST'){
  const user=await db.prepare("SELECT * FROM users WHERE email=? AND auth_provider='legacy'").bind(String(body.email||'').trim().toLowerCase()).first();
  if(!user||await hash(String(body.password||''),user.salt)!==user.password)error('Email or password is incorrect.',401);
  return login(user,request,db);
 }
 if(path==='/api/signup'&&method==='POST'){
  if(!['student','recruiter'].includes(body.role))error('Choose a student or recruiter account.');
  const email=String(body.email||'').trim().toLowerCase(),name=String(body.name||'').trim();
  if(!name||name.length>100||!/^\S+@\S+\.\S+$/.test(email)||String(body.password||'').length<8)error('Enter your name, a valid email and a password with at least 8 characters.');
  if(await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first())error('An account with this email already exists.',409);
  const salt=id(),uid=id(),password=await hash(body.password,salt);
  const queries=[db.prepare('INSERT INTO users(id,name,email,password,salt,role) VALUES(?,?,?,?,?,?)').bind(uid,name,email,password,salt,body.role)];
  if(body.role==='recruiter'){if(!String(body.company||'').trim())error('Enter your company name.');queries.push(db.prepare('INSERT INTO companies(id,owner_id,name,industry,logo) VALUES(?,?,?,?,?)').bind(id(),uid,String(body.company).trim(),'Technology',String(body.company).trim()[0]));}
  await db.batch(queries);return login(await db.prepare('SELECT * FROM users WHERE id=?').bind(uid).first(),request,db);
 }
 let account;
 if(usesClerk){
  const identity=await verifyClerkIdentity(request,env);
  account=await db.prepare("SELECT * FROM users WHERE clerk_user_id=? AND auth_provider='clerk'").bind(identity.userId).first();
  if(path==='/api/onboard'&&method==='POST'){
   if(!account)account=await provisionAccount(db,await providerProfile(env,identity),body);
   return json({user:publicUser(account)});
  }
  if(!account)throw Object.assign(new Error('Choose your role to finish setting up your workspace.'),{status:403,code:'ONBOARDING_REQUIRED'});
 }else account=await session(request,db);
 const user=authorize(account);
 if(path==='/api/state'&&method==='GET')return json(await state(user,db));
 if(path==='/api/logout'&&method==='POST'){const token=request.headers.get('Cookie')?.match(/cb_session=([^;]+)/)?.[1];await db.prepare('DELETE FROM sessions WHERE token=?').bind(token||'').run();return json({ok:true},200,{'Set-Cookie':cookie('',request,true)});}
 if(path==='/api/profile'&&method==='PUT'){
  authorize(user,'student');const {name,department,cgpa,graduation_year,resume,bio}=body;
  if(!name||!['CSE','IT','ECE','EEE','ME','CE','MBA'].includes(department)||!Number.isFinite(Number(cgpa))||Number(cgpa)<0||Number(cgpa)>10||!Number.isInteger(Number(graduation_year))||Number(graduation_year)<2024||Number(graduation_year)>2035||!safeUrl(resume))error('Enter a valid name, department, CGPA (0–10), graduation year and an HTTP(S) resume link.');
  const selectedSkills=body.skills===undefined?(user.skills||'[]'):JSON.stringify(normalizeSkills(body.skills));
  await db.prepare('UPDATE users SET name=?,department=?,cgpa=?,graduation_year=?,resume=?,bio=?,skills=? WHERE id=?').bind(String(name).slice(0,100),department,Number(cgpa),Number(graduation_year),String(resume||'').slice(0,2000),String(bio||'').slice(0,2000),selectedSkills,user.id).run();return json({ok:true});
 }
 if(path==='/api/company'&&method==='PUT'){
  authorize(user,'recruiter');const company=await db.prepare('SELECT * FROM companies WHERE owner_id=?').bind(user.id).first();if(!company)error('Company not found.',404);
  if(!body.name||!safeUrl(body.website))error('Enter a company name and a valid HTTP(S) website.');
  await db.prepare("UPDATE companies SET name=?,industry=?,website=?,location=?,description=?,status='pending',reason='' WHERE id=?").bind(String(body.name).slice(0,100),String(body.industry||'Technology').slice(0,100),String(body.website||'').slice(0,2000),String(body.location||'').slice(0,100),String(body.description||'').slice(0,5000),company.id).run();return json({ok:true,message:'Company profile submitted for review.'});
 }
 if((path==='/api/jobs'||path.startsWith('/api/jobs/'))&&['POST','PUT'].includes(method)){
  authorize(user,'recruiter');const company=await db.prepare('SELECT * FROM companies WHERE owner_id=?').bind(user.id).first();if(!company)error('Create a company profile first.');
  const jid=path.split('/')[3];if(method==='PUT'){const old=await db.prepare('SELECT * FROM jobs WHERE id=? AND company_id=?').bind(jid,company.id).first();if(!old)error('Posting not found.',404);if(body.close){await db.prepare("UPDATE jobs SET status='closed' WHERE id=?").bind(jid).run();return json({ok:true});}}
  const {title,type,location,mode,salary,min_cgpa,departments,deadline,description,skills}=body;
  if(!title||!['Full-time','Internship'].includes(type)||!location||!salary||!Number.isFinite(Number(min_cgpa))||Number(min_cgpa)<0||Number(min_cgpa)>10||!Array.isArray(departments)||!departments.length||departments.some(d=>!['CSE','IT','ECE','EEE','ME','CE','MBA'].includes(d))||!/^\d{4}-\d{2}-\d{2}$/.test(deadline)||new Date(deadline+'T23:59:59Z').getTime()<Date.now()||!description)error('Complete every required field, select valid departments, and choose a future deadline.');
  const vals=[String(title).slice(0,150),type,String(location).slice(0,100),String(mode||'Hybrid').slice(0,30),String(salary).slice(0,100),Number(min_cgpa),JSON.stringify(departments),deadline,String(description).slice(0,10000),JSON.stringify(normalizeSkills(skills||[])),body.draft?'draft':'pending'];
  if(method==='POST')await db.prepare('INSERT INTO jobs(id,company_id,title,type,location,mode,salary,min_cgpa,departments,deadline,description,skills,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id(),company.id,...vals).run();
  else await db.prepare("UPDATE jobs SET title=?,type=?,location=?,mode=?,salary=?,min_cgpa=?,departments=?,deadline=?,description=?,skills=?,status=?,reason='' WHERE id=?").bind(...vals,jid).run();return json({ok:true});
 }
 if(path==='/api/apply'&&method==='POST'){
  authorize(user,'student');const job=await db.prepare("SELECT j.* FROM jobs j JOIN companies c ON j.company_id=c.id WHERE j.id=? AND j.status='approved' AND c.status='approved'").bind(body.job_id).first();if(!job)error('This opening is not available.',404);
  if(new Date(job.deadline+'T23:59:59Z').getTime()<Date.now())error('The application deadline has passed.',409);
  const eligible=eligibility(user,job);if(!eligible.eligible)error(eligible.reason,403);
  if(await db.prepare('SELECT id FROM applications WHERE student_id=? AND job_id=?').bind(user.id,job.id).first())error('You have already applied for this opening.',409);
  const stamp=new Date().toISOString();try{await db.prepare('INSERT INTO applications(id,student_id,job_id,snapshot,history) VALUES(?,?,?,?,?)').bind(id(),user.id,job.id,JSON.stringify(publicUser(user)),JSON.stringify([{status:'Applied',at:stamp,by:user.id,note:'Application received'}])).run();}catch(e){if(String(e).includes('UNIQUE'))error('You have already applied for this opening.',409);throw e;}return json({ok:true});
 }
 if(path==='/api/status'&&method==='POST'){
  authorize(user,'recruiter');if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>100)error('Select between 1 and 100 applicants.');const queries=[];
  for(const aid of [...new Set(body.ids)]){const a=await db.prepare('SELECT a.* FROM applications a JOIN jobs j ON a.job_id=j.id JOIN companies c ON j.company_id=c.id WHERE a.id=? AND c.owner_id=?').bind(aid,user.id).first();if(!a)error('Applicant not found or outside your company.',403);if(!canTransition(a.status,body.status))error(`Cannot move ${a.status} to ${body.status}. Advance one stage at a time.`,409);
   const history=JSON.parse(a.history);history.push({status:body.status,at:new Date().toISOString(),by:user.id,note:body.note||`Moved to ${body.status}`});queries.push(db.prepare('UPDATE applications SET status=?,history=? WHERE id=? AND status=?').bind(body.status,JSON.stringify(history),aid,a.status));}
  await db.batch(queries);return json({ok:true});
 }
 if(path==='/api/review'&&method==='POST'){
  authorize(user,'admin');if(!['company','job'].includes(body.type)||!['approved','rejected'].includes(body.action))error('Invalid review.');if(body.action==='rejected'&&!String(body.reason||'').trim())error('Please give a reason for rejection.');
  const table=body.type==='company'?'companies':'jobs';const target=await db.prepare(`SELECT * FROM ${table} WHERE id=?`).bind(body.id).first();if(!target)error('Submission not found.',404);if(target.status!=='pending')error('This submission has already been reviewed.',409);
  if(body.type==='job'&&body.action==='approved'){const c=await db.prepare('SELECT status FROM companies WHERE id=?').bind(target.company_id).first();if(c.status!=='approved')error('Approve the company before approving its posting.',409);}
  await db.batch([db.prepare(`INSERT INTO audit_logs(id,reviewer_id,target_id,target_type,action,reason) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ${table} WHERE id=? AND status='pending')`).bind(id(),user.id,body.id,body.type,body.action,String(body.reason||'').slice(0,2000),body.id),db.prepare(`UPDATE ${table} SET status=?,reason=? WHERE id=? AND status='pending'`).bind(body.action,String(body.reason||'').slice(0,2000),body.id)]);return json({ok:true});
 }
 if(path.startsWith('/api/saved/')&&['POST','DELETE'].includes(method)){
  authorize(user,'student');const jid=path.split('/')[3];if(method==='POST'){const visible=await db.prepare("SELECT j.id FROM jobs j JOIN companies c ON c.id=j.company_id WHERE j.id=? AND j.status='approved' AND c.status='approved'").bind(jid).first();if(!visible)error('Opening not found.',404);await db.prepare('INSERT OR IGNORE INTO saved_jobs(student_id,job_id) VALUES(?,?)').bind(user.id,jid).run();}else await db.prepare('DELETE FROM saved_jobs WHERE student_id=? AND job_id=?').bind(user.id,jid).run();return json({ok:true});
 }
 return json({error:'Not found'},404);
}
export default {async fetch(request,env){const url=new URL(request.url);try{if(url.pathname.startsWith('/api/'))return await api(request,env);return await env.ASSETS.fetch(request);}catch(e){console.error(e.status?e.message:'Server error');return json({error:e.status?e.message:'Something went wrong. Please try again.',...(e.status&&e.code?{code:e.code}:{})},e.status||500);}}};
