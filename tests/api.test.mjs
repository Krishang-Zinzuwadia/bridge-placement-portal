import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {pbkdf2Sync} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import worker from '../worker/index.mjs';
function setup(){const sqlite=new DatabaseSync(':memory:');for(const migration of readdirSync('migrations').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('migrations/'+migration,'utf8'));sqlite.exec(readFileSync('scripts/seed.sql','utf8'));const DB={prepare(sql){const stmt=sqlite.prepare(sql);return {bind(...values){return {first:async()=>stmt.get(...values)||null,all:async()=>({results:stmt.all(...values)}),run:async()=>({meta:stmt.run(...values)})}},first:async()=>stmt.get()||null,all:async()=>({results:stmt.all()}),run:async()=>({meta:stmt.run()})}},async batch(queries){sqlite.exec('BEGIN');try{const results=[];for(const q of queries)results.push(await q.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}};const env={DB,ASSETS:{fetch:()=>new Response('asset')}};return {sqlite,async call(path,{method='GET',body,cookie}={}){const headers={};if(body)headers['Content-Type']='application/json';if(cookie)headers.Cookie=cookie;const response=await worker.fetch(new Request('https://campusbridge.test/api'+path,{method,headers,body:body?JSON.stringify(body):undefined}),env);return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};},close:()=>sqlite.close()};}
async function login(s,role){const r=await s.call('/login',{method:'POST',body:{username:role,password:role}});assert.equal(r.status,200);return r.cookie;}
test('reviewer usernames and matching role passwords open only their persisted workspace',async()=>{const s=setup();for(const role of ['student','recruiter','admin']){const r=await s.call('/login',{method:'POST',body:{username:role,password:role}});assert.equal(r.status,200);assert.equal(r.data.user.id,role+'-demo');assert.equal(r.data.user.role,role);assert.equal((await s.call('/state',{cookie:r.cookie})).data.user.role,role);}s.close()});
test('demo email aliases still work with updated passwords and incorrect role passwords are rejected',async()=>{const s=setup();for(const role of ['student','recruiter','admin']){assert.equal((await s.call('/login',{method:'POST',body:{email:role+'@campusbridge.demo',password:role}})).status,200);assert.equal((await s.call('/login',{method:'POST',body:{username:role,password:'Campus@2026'}})).status,401);}assert.equal((await s.call('/login',{method:'POST',body:{username:'unknown',password:'admin'}})).status,401);s.close()});
test('reviewer aliases cannot sign in to the Clerk deployment',async()=>{for(const role of ['student','recruiter','admin']){const response=await worker.fetch(new Request('https://campusbridge.test/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:role,password:role})}),{AUTH_MODE:'clerk',DB:{}});assert.equal(response.status,409);}});
test('demo credential migration upgrades exact legacy reviewer rows without changing profiles or Clerk accounts',async()=>{const s=setup();for(const role of ['student','recruiter','admin']){const uid=role+'-demo',salt='old-demo-'+role;s.sqlite.prepare('UPDATE users SET password=?,salt=? WHERE id=?').run(pbkdf2Sync('Campus@2026',salt,100000,32,'sha256').toString('hex'),salt,uid);}s.sqlite.prepare("UPDATE users SET auth_provider='clerk',clerk_user_id='user_protected' WHERE id='admin-demo'").run();const protectedAdmin=s.sqlite.prepare("SELECT password,salt FROM users WHERE id='admin-demo'").get();const before=s.sqlite.prepare("SELECT name,cgpa,resume FROM users WHERE id='student-demo'").get();s.sqlite.exec(readFileSync('scripts/migrate-demo-credentials.sql','utf8'));assert.deepEqual(s.sqlite.prepare("SELECT name,cgpa,resume FROM users WHERE id='student-demo'").get(),before);assert.deepEqual(s.sqlite.prepare("SELECT password,salt FROM users WHERE id='admin-demo'").get(),protectedAdmin);for(const role of ['student','recruiter'])assert.equal((await s.call('/login',{method:'POST',body:{username:role,password:role}})).status,200);assert.equal((await s.call('/login',{method:'POST',body:{username:'admin',password:'admin'}})).status,401);s.close()});

test('recruiter and admin can edit only their own personal profile without changing account permissions or company',async()=>{
 const s=setup();
 for(const role of ['recruiter','admin']){
  const cookie=await login(s,role),before=(await s.call('/state',{cookie})).data.user;
  const companyBefore=s.sqlite.prepare("SELECT * FROM companies WHERE id='c-layers'").get();
  const result=await s.call('/account-profile',{method:'PUT',cookie,body:{name:'  Updated '+role+'  ',bio:'A personal introduction.',id:'student-demo',role:'student',email:'attacker@example.com',department:'CSE',cgpa:10}});
  assert.equal(result.status,200);
  const after=(await s.call('/state',{cookie})).data.user;
  assert.equal(after.name,'Updated '+role);assert.equal(after.bio,'A personal introduction.');
  assert.equal(after.id,before.id);assert.equal(after.role,role);assert.equal(after.email,before.email);
  assert.equal(after.department,before.department);assert.equal(after.cgpa,before.cgpa);
  assert.deepEqual(s.sqlite.prepare("SELECT * FROM companies WHERE id='c-layers'").get(),companyBefore);
  assert.equal(s.sqlite.prepare("SELECT name FROM users WHERE id='student-demo'").get().name,'Aarav Sharma');
 }
 s.close();
});

test('personal profile updates validate names and keep student academic editing separate',async()=>{
 const s=setup(),cookie=await login(s,'recruiter');
 for(const name of ['   ',null,{},'x'.repeat(101)])assert.equal((await s.call('/account-profile',{method:'PUT',cookie,body:{name,bio:''}})).status,400);
 assert.equal((await s.call('/account-profile',{method:'PUT',cookie,body:{name:'Maya Kapoor',bio:'x'.repeat(2001)}})).status,400);
 assert.equal((await s.call('/account-profile',{method:'PUT',body:{name:'Anonymous'}})).status,401);
 const student=await login(s,'student');
 assert.equal((await s.call('/account-profile',{method:'PUT',cookie:student,body:{name:'Student'}})).status,403);
 assert.equal((await s.call('/profile',{method:'PUT',cookie,body:{name:'Recruiter',department:'CSE',cgpa:9,graduation_year:2027}})).status,403);
 s.close();
});

test('posting creation rejects malformed and impossible calendar deadlines',async()=>{
 const s=setup(),cookie=await login(s,'recruiter');
 const body={title:'Calendar validation',type:'Internship',location:'Remote',mode:'Remote',salary:'₹20,000',min_cgpa:0,departments:['CSE'],description:'A valid description',skills:[]};
 const before=s.sqlite.prepare('SELECT COUNT(*) AS count FROM jobs').get().count;
 for(const deadline of ['2030-99-99','2030-02-30','2030-04-31']){
  const result=await s.call('/jobs',{method:'POST',cookie,body:{...body,deadline}});
  assert.equal(result.status,400,deadline+' should be rejected');
 }
 assert.equal(s.sqlite.prepare('SELECT COUNT(*) AS count FROM jobs').get().count,before);
 assert.equal((await s.call('/jobs',{method:'POST',cookie,body:{...body,deadline:'2032-02-29'}})).status,200);
 s.close();
});
test('anonymous users cannot access workspace data',async()=>{const s=setup();assert.equal((await s.call('/state')).status,401);s.close()});

test('opaque and malformed mutation origins are refused without a server error',async()=>{
 const s=setup();
 for(const Origin of ['null','malformed-origin','file://localhost']){
  const response=await worker.fetch(new Request('http://127.0.0.1/api/review',{method:'POST',headers:{Origin,'Content-Type':'application/json'},body:'{}'}),{DB:s.sqlite});
  assert.equal(response.status,403,Origin);
 }
 s.close();
});
test('login sets an HTTP-only cookie and rejects a wrong password',async()=>{const s=setup();const r=await s.call('/login',{method:'POST',body:{email:'student@campusbridge.demo',password:'wrong'}});assert.equal(r.status,401);const cookie=await login(s,'student');assert.ok(cookie.startsWith('cb_session='));s.close()});
test('student sees approved openings and only their own applications',async()=>{const s=setup(),cookie=await login(s,'student');const r=await s.call('/state',{cookie});assert.equal(r.status,200);assert.equal(r.data.jobs.length,6);assert.equal(r.data.applications.length,3);assert.ok(r.data.applications.every(a=>a.student_id==='student-demo'));assert.equal(r.data.user.password,undefined);assert.equal(r.data.jobs.some(j=>j.status!=='approved'),false);s.close()});
test('ineligible submission is blocked by the server',async()=>{const s=setup();const r=await s.call('/login',{method:'POST',body:{email:'ineligible@campusbridge.demo',password:'Campus@2026'}});const blocked=await s.call('/apply',{method:'POST',cookie:r.cookie,body:{job_id:'j-product'}});assert.equal(blocked.status,403);assert.match(blocked.data.error,/minimum CGPA/);assert.equal(s.sqlite.prepare("SELECT COUNT(*) AS count FROM applications WHERE student_id='student-low'").get().count,0);s.close()});
test('eligible submission persists a snapshot and duplicate is blocked',async()=>{const s=setup(),cookie=await login(s,'student');const r=await s.call('/apply',{method:'POST',cookie,body:{job_id:'j-product'}});assert.equal(r.status,200);const row=s.sqlite.prepare("SELECT * FROM applications WHERE job_id='j-product' AND student_id='student-demo'").get();assert.equal(JSON.parse(row.snapshot).cgpa,8.6);assert.equal((await s.call('/apply',{method:'POST',cookie,body:{job_id:'j-product'}})).status,409);s.close()});
test('student cannot approve submissions even with a crafted request',async()=>{const s=setup(),cookie=await login(s,'student');assert.equal((await s.call('/review',{method:'POST',cookie,body:{id:'c-forma',type:'company',action:'approved'}})).status,403);s.close()});
test('recruiter cannot access or transition another company’s candidate',async()=>{const s=setup(),cookie=await login(s,'recruiter');const r=await s.call('/state',{cookie});assert.ok(r.data.jobs.every(j=>j.company_id==='c-layers'));assert.equal(r.data.applications.some(a=>a.id==='a-demo-front'),false);assert.equal((await s.call('/status',{method:'POST',cookie,body:{ids:['a-demo-front'],status:'Offered'}})).status,403);s.close()});
test('batch updates validate all candidates before any mutation',async()=>{const s=setup(),cookie=await login(s,'recruiter');const r=await s.call('/status',{method:'POST',cookie,body:{ids:['a-demo-design','a-sana-full'],status:'Interview'}});assert.equal(r.status,409);assert.equal(s.sqlite.prepare("SELECT status FROM applications WHERE id='a-demo-design'").get().status,'Shortlisted');s.close()});
test('batch hiring update persists each candidate’s history',async()=>{const s=setup(),cookie=await login(s,'recruiter');assert.equal((await s.call('/status',{method:'POST',cookie,body:{ids:['a-demo-design','a-meera-design'],status:'Interview',note:'Meet the team next week.'}})).status,200);for(const id of ['a-demo-design','a-meera-design']){const a=s.sqlite.prepare('SELECT * FROM applications WHERE id=?').get(id);assert.equal(a.status,'Interview');assert.equal(JSON.parse(a.history).at(-1).note,'Meet the team next week.')}s.close()});
test('admin must approve a company before its job and records reviewer ID',async()=>{const s=setup(),cookie=await login(s,'admin');assert.equal((await s.call('/review',{method:'POST',cookie,body:{id:'j-forma',type:'job',action:'approved'}})).status,409);assert.equal((await s.call('/review',{method:'POST',cookie,body:{id:'c-forma',type:'company',action:'approved'}})).status,200);assert.equal((await s.call('/review',{method:'POST',cookie,body:{id:'j-forma',type:'job',action:'approved'}})).status,200);const log=s.sqlite.prepare("SELECT * FROM audit_logs WHERE target_id='j-forma'").get();assert.equal(log.reviewer_id,'admin-demo');assert.ok(log.created_at);const student=await login(s,'student');assert.equal((await s.call('/state',{cookie:student})).data.jobs.some(j=>j.id==='j-forma'),true);s.close()});
test('rejections require a reason and become auditable',async()=>{const s=setup(),cookie=await login(s,'admin');assert.equal((await s.call('/review',{method:'POST',cookie,body:{id:'c-canopy',type:'company',action:'rejected'}})).status,400);assert.equal((await s.call('/review',{method:'POST',cookie,body:{id:'c-canopy',type:'company',action:'rejected',reason:'Please provide verification documents.'}})).status,200);assert.equal(s.sqlite.prepare("SELECT reason FROM audit_logs WHERE target_id='c-canopy'").get().reason,'Please provide verification documents.');s.close()});
test('public signup cannot create an admin account',async()=>{const s=setup();assert.equal((await s.call('/signup',{method:'POST',body:{name:'Attacker',email:'admin2@test.com',password:'password1',role:'admin'}})).status,400);s.close()});
test('expired session is refused and logout revokes access',async()=>{const s=setup(),cookie=await login(s,'student');s.sqlite.prepare('UPDATE sessions SET expires=0').run();assert.equal((await s.call('/state',{cookie})).status,401);const fresh=await login(s,'student');assert.equal((await s.call('/logout',{method:'POST',cookie:fresh,body:{}})).status,200);assert.equal((await s.call('/state',{cookie:fresh})).status,401);s.close()});
test('profile edit is validated and prior application snapshots remain unchanged',async()=>{const s=setup(),cookie=await login(s,'student');assert.equal((await s.call('/profile',{method:'PUT',cookie,body:{name:'Aarav',department:'CSE',cgpa:11,graduation_year:2027,resume:'https://example.com/resume'}})).status,400);assert.equal((await s.call('/profile',{method:'PUT',cookie,body:{name:'Aarav',department:'CSE',cgpa:9,graduation_year:2027,resume:'https://example.com/resume'}})).status,200);assert.equal(JSON.parse(s.sqlite.prepare("SELECT snapshot FROM applications WHERE id='a-demo-design'").get().snapshot).cgpa,8.6);s.close()});
test('cross-origin mutations are blocked',async()=>{const s=setup();const response=await worker.fetch(new Request('https://campusbridge.test/api/login',{method:'POST',headers:{Origin:'https://untrusted.test','Content-Type':'application/json'},body:'{}'}),{DB:{}});assert.equal(response.status,403);s.close()});
test('profile skill choices persist in D1 and are returned to the student',async()=>{const s=setup(),cookie=await login(s,'student');const updated=await s.call('/profile',{method:'PUT',cookie,body:{name:'Aarav Sharma',department:'CSE',cgpa:8.6,graduation_year:2027,resume:'https://example.com/resume',skills:['React','TypeScript']}});assert.equal(updated.status,200);const result=await s.call('/state',{cookie});assert.equal(result.data.user.skills,'["React","TypeScript"]');s.close()});
test('invalid profile skill names are rejected without overwriting existing skills',async()=>{const s=setup(),cookie=await login(s,'student');const response=await s.call('/profile',{method:'PUT',cookie,body:{name:'Aarav Sharma',department:'CSE',cgpa:8.6,graduation_year:2027,resume:'https://example.com/resume',skills:['Unknown custom injection']}});assert.equal(response.status,400);s.close()});
