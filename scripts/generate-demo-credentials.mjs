import {pbkdf2Sync} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';

const roles=['student','recruiter','admin'];
let seed=readFileSync('scripts/seed.sql','utf8');
const migration=['-- Reviewer demo credential migration.','-- Run ONLY against campusbridge-portal-db, never campusbridge-live-db.','-- Bound by canonical ID, email, role, and legacy provider; application records stay intact.'];
for(const role of roles){
 const id=role+'-demo',salt='campusbridge-demo-'+id;
 const oldHash=pbkdf2Sync('Campus@2026',salt,100000,32,'sha256').toString('hex');
 const hash=pbkdf2Sync(role,salt,100000,32,'sha256').toString('hex');
 seed=seed.replaceAll(oldHash,hash);
 migration.push(`UPDATE users SET password='${hash}',salt='${salt}' WHERE id='${id}' AND email='${role}@campusbridge.demo' AND role='${role}' AND auth_provider='legacy';`);
}
writeFileSync('scripts/seed.sql',seed);
writeFileSync('scripts/migrate-demo-credentials.sql',migration.join('\n')+'\n');
console.log('Generated bounded reviewer demo credential migration for student, recruiter, and admin.');
