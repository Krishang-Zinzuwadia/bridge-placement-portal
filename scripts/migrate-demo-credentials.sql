-- Reviewer demo credential migration.
-- Run ONLY against campusbridge-portal-db, never campusbridge-live-db.
-- Bound by canonical ID, email, role, and legacy provider; application records stay intact.
UPDATE users SET password='af4748a473416a475c300d62052f1dfa75da1a9df67fa86c5edf9b0320ab2ed8',salt='campusbridge-demo-student-demo' WHERE id='student-demo' AND email='student@campusbridge.demo' AND role='student' AND auth_provider='legacy';
UPDATE users SET password='4b4c36f3f38a7f7c42c23150aa35073102df3f176d88662a50d71e9a62467bf5',salt='campusbridge-demo-recruiter-demo' WHERE id='recruiter-demo' AND email='recruiter@campusbridge.demo' AND role='recruiter' AND auth_provider='legacy';
UPDATE users SET password='c0bada613f384cc1c27799c47400a66c44682ec54d7857b1d31130abe3c955f0',salt='campusbridge-demo-admin-demo' WHERE id='admin-demo' AND email='admin@campusbridge.demo' AND role='admin' AND auth_provider='legacy';
