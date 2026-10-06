-- Add stable provider identity without changing existing demo accounts or ownership.
ALTER TABLE users ADD COLUMN clerk_user_id TEXT;
ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'legacy' CHECK(auth_provider IN ('legacy','clerk'));
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0 CHECK(email_verified IN (0,1));
CREATE UNIQUE INDEX users_clerk_identity ON users(clerk_user_id);
