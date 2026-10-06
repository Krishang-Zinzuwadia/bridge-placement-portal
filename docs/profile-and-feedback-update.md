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

## Deployed verification

Both existing Workers were deployed from this update. Remote HTTP checks verified the Bridge title and current compiled asset on both URLs, expected demo/Clerk modes, private upload configuration and anonymous workspace denial. All three matching role logins succeeded against the deployed reviewer database, returned their exact canonical identities and logged out successfully. The Clerk app refused all three mock login requests.

| Worker | Deployed version |
| --- | --- |
| Reviewer demo | `6aa7e532-d2be-4c02-a7cf-fef10148deda` |
| Real-account app | `77b1d731-46fd-4ecc-9c86-2ff24b04954c` |

GitHub CI executed successfully for the pull request and its branch push: [PR validation](https://github.com/Krishang-Zinzuwadia/campusbridge-placement-portal/actions/runs/37525397829), [push validation](https://github.com/Krishang-Zinzuwadia/campusbridge-placement-portal/actions/runs/37525350184). These runs installed locked dependencies, validated workflows, linted, tested and built on Node 24.

GitHub Actions/lint/deployment configuration and its credential requirements are documented in [CI/CD](ci-cd.md). [Automatic deployment on main](https://github.com/Krishang-Zinzuwadia/campusbridge-placement-portal/actions/runs/37529205593) passed, including validation, both database/Worker updates and smoke checks. The correctly scoped Cloudflare secret is configured in GitHub, and the deployment environment is restricted to main. Fresh remote HTTP checks after this run again passed all three reviewer logins, correct identities/logout, current brand/assets, private upload configuration, anonymous denial and Clerk mock-login refusal.
