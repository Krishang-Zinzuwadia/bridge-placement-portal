# Deployment verification

Live URL: https://campusbridge-portal.krishangzinzuwadia.workers.dev

Public repository: https://github.com/Krishang-Zinzuwadia/campusbridge-placement-portal

Cloudflare Worker: campusbridge-portal

Version: 4e22d15b-873f-4052-9d70-7208b6207ec7

D1 binding: DB; dedicated database: campusbridge-portal-db

Verified on 6 October 2026:

- Landing and hero asset return HTTP 200.
- Anonymous workspace data requests return HTTP 401.
- Student login succeeds; role-scoped state contains 6 approved openings and 3 own applications.
- Recruiter login succeeds; role-scoped state contains 3 owned postings and 8 owned applications.
- Admin login succeeds; state contains 9 postings, 12 applications and reviewer-attributed audit records.
- Student attempting the admin review API returns HTTP 403.
- Low-CGPA student attempting an 8.0-CGPA opening returns HTTP 403 with an explanatory notice.
- Hosted cookies include HttpOnly and Secure.
- 23 automated tests pass; TypeScript and production Vite build succeed.
- Browser QA verified application submission and tracking, direct URL role boundary, recruiter batch updates, admin review/audit persistence, mobile width, generated image/font loading, and appearance controls.

Application state uses 15-second polling. Test browser mutations were performed against local D1; deployed demo records retain the initial seed for reviewers.
