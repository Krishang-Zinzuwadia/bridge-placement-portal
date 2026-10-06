# CampusBridge · WEB-03

A three-tier campus placement and internship portal with a polished landing page and separate Student, Company Recruiter, and Placement Cell Admin workspaces. Runs directly on a **Cloudflare Worker**, with **D1** persistence. No Sites hosting dependency.

## Local setup

Requires Node.js 22.13+ and npm. From the repository root:

```sh
npm install
npm run build
npm run db:migrate
npm run db:seed
npm run preview
```

Open the local URL printed by Wrangler, normally `http://localhost:8787`. This serves the compiled frontend and Worker API against local D1.

For frontend hot reload, keep `npm run preview` running, then run `npm run dev` in a second terminal. Vite proxies `/api` to `127.0.0.1:8787`.

## Mock login credentials

All mock accounts use **`Campus@2026`**. Quick demo buttons are also available on `/login`.

| Role | Email | Sample account |
| --- | --- | --- |
| Student | `student@campusbridge.demo` | Aarav Sharma · CSE · 8.6 CGPA |
| Recruiter | `recruiter@campusbridge.demo` | Maya Kapoor · Layers |
| Admin | `admin@campusbridge.demo` | Ananya Rao · Placement cell |
| Ineligible student | `ineligible@campusbridge.demo` | Rohan Mehta · CSE · 6.4 CGPA |

Companies, institute, people, opportunities, and activity are illustrative demo data. Resume and company URLs in the seed are example URLs; replace them with accessible links when using real records. Demo accounts share mutable demo records. Application snapshots preserve the original submitted profile. These seeded institutional admin credentials are for reviewer demonstrations; change the seeded credentials before real institutional use.

## Sample database population

`npm run db:seed` generates fresh example deadlines and inserts 8 students, 6 companies, 9 openings, 12 applications, a saved opening, and 10 initial approval logs. Seeds use `INSERT OR IGNORE`; repeating a seed does not reset existing decisions or records.

```sh
node scripts/generate-seed.mjs
npx wrangler d1 execute campusbridge-portal-db --local --file scripts/seed.sql
```

## Cloudflare deployment

The checked-in configuration points to the requested deployment account and its dedicated database. To deploy in a different account, replace `account_id` and create a D1 database; update its `database_id` and `database_name` in `wrangler.jsonc`.

```sh
npx wrangler login
npx wrangler d1 create campusbridge-portal-db
# Update wrangler.jsonc with your D1 ID, account, and Worker name.
npx wrangler d1 migrations apply campusbridge-portal-db --remote
npx wrangler d1 execute campusbridge-portal-db --remote --file scripts/seed.sql
npm run deploy
```

Do not create a second database if you are deploying to the already configured account. Remote and local databases are independent. Apply schema migrations before using the API; no table creation runs during requests.

## Workflows

- **Public:** editorial landing page, responsive navigation, product overview, role explanations, FAQs, registration and login.
- **Student:** dashboard, approved opportunity discovery, search/type/work-mode/eligibility filters, saved openings, job detail, application confirmation, application lists and timelines, profile editor.
- **Recruiter:** company profile submission, posting creation/editing/drafts/closing, approval feedback, owned candidate list, submitted profile/resume review, CSV export, single and batch stage transitions.
- **Admin:** separate company/posting queues, complete review pages, approval/rejection with feedback, application oversight, searchable audit log with reviewer IDs and timestamps.

Companies and postings must both be approved before students can discover or apply. Profile/posting edits return the submission to the review queue. The backend blocks insufficient CGPA, unsupported departments, missing resumes, expired deadlines, and duplicate applications. Recruiters can update only candidates who applied to their company. Batch updates validate every candidate before writing. Hiring progresses `Applied → Shortlisted → Interview → Offered → Selected`, or `Rejected` from an active stage; terminal outcomes cannot be reversed.

Workspace state refreshes every **15 seconds**. This is near-real-time polling, not a WebSocket stream. Public signup is available for students and recruiters; administrator accounts are provisioned by the institution. Every API mutation enforces session identity, role, and ownership where applicable. Session cookies are HTTP-only, SameSite=Lax, and Secure over HTTPS. Passwords use salted PBKDF2-SHA256. Cross-origin browser mutations are refused.

## Verification

```sh
npm test
npm run build
```

The test suite covers eligibility thresholds, department/resume gating, role authorization, password checks, scoped state, duplicate submission, snapshot persistence, recruiter ownership, all-or-nothing batch validation, status history, company-before-posting approval, rejection reasons, audit timestamps/reviewer IDs, admin signup blocking, expired/revoked sessions, and cross-origin request rejection. Integration tests use Node's built-in SQLite to execute the actual Worker queries against the actual schema and seed. Node 22 may print an experimental SQLite warning.

## Reviewer walkthrough

1. Open the student demo; browse openings and inspect the 9.0-CGPA Machine Learning Intern role to see an explanatory eligibility notice.
2. Apply to an eligible opening that has no existing application, then open its tracking page.
3. Open the recruiter demo. Select candidates at the same stage and update their hiring stage together; students see the change on the next state refresh.
4. Open the admin demo. Approve a pending company, then its posting. Visit the audit log to inspect the reviewer ID, decision, note, and timestamp.
5. Log in as the ineligible student and try applying to an 8.0-CGPA opening. The server blocks submission, including a direct API request.

## Source organization

`src/Landing.tsx`, `src/Auth.tsx`, and `src/Portal.tsx` define public/entry/shared layouts. `src/Student.tsx`, `src/Recruiter.tsx`, and `src/Admin.tsx` implement role workflows. `src/core.tsx` contains shared UI, API access, and modal keyboard behavior. `worker/index.mjs` handles sessions and the API; `worker/rules.mjs` contains business rules. D1 schema lives in `migrations/0001_schema.sql`; demo population lives in `scripts/`.

The layout adapts to mobile with a collapsible sidebar, opportunity cards, scrollable data tables, and stacked detail/forms. Modal dialogs trap keyboard focus, restore focus on close, and support Escape. Motion respects reduced-motion preferences. The bridge illustration and logo are original SVG artwork. Typography uses Google Fonts with system fallbacks.
