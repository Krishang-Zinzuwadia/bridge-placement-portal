# Bridge profile and feedback update — 7 October 2026

Personal profile changes are available only through each role's **My profile** page. Student academic details, skills and PDF resume remain on `/student/profile`. Recruiters and administrators now have `/recruiter/profile` and `/admin/profile` for personal name, introduction and photo. The account menu displays identity and links to My profile and sign-out; it no longer contains a file input or photo mutation action. Company information remains in the recruiter's Company profile workflow and still requires placement-cell review.

The new personal-profile endpoint authenticates the user, permits only recruiter/admin roles and updates only the authenticated row's name and bio. It validates those fields and cannot modify email, role, academic eligibility, another account or company data. Existing upload authorization and immutable application snapshots remain in effect. A browser's current URL is not an authorization signal; the backend continues enforcing role and ownership independently.

The user-facing brand is **Bridge**. Existing repository, Worker URLs, storage identifiers and account email addresses are retained. Reviewer demo credentials are `student/student`, `recruiter/recruiter` and `admin/admin`; the README and demo login page list them. Existing demo records are updated through the bounded, idempotent `scripts/migrate-demo-credentials.sql`, without reseeding or resetting applications. This script is never applied to the real-account database; Clerk remains the authentication provider there.

## Verification

- Fresh `npm run check`: ESLint with zero warnings/errors, 81 passing tests, TypeScript and Vite build.
- New API tests exercise authenticated recruiter/admin profile persistence, immutable identity/permissions/company data, invalid names/bios, anonymous denial and student/recruiter endpoint separation.
- Demo credential tests cover all three matching username/password pairs, email aliases, wrong-password rejection, Clerk refusal, and migration preservation of profile fields and Clerk-managed records.
- Actual local compiled-app browser checks: recruiter quick login, manual admin/admin login and student quick login reach their assigned workspaces; each account menu only offers My profile/sign-out. Recruiter and admin profile routes open correctly. Recruiter introduction saves and persists after reload, and the new profile page was inspected in dark appearance.
- Recruiter zero-CGPA draft reopened with the actual input still displaying `0`; submitted candidate identity is now consistent on the overview as well as applicant list/search/export/detail.

GitHub Actions/lint/deployment configuration and its credential requirements are documented in [CI/CD](ci-cd.md). Automatic deployment is not verified until its scoped Cloudflare secret is configured and a GitHub run succeeds. Local authenticated Worker deployment is a separate verification path.
