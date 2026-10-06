# Deployment verification

Real-account URL: https://campusbridge-live.krishangzinzuwadia.workers.dev

Reviewer demo URL: https://campusbridge-portal.krishangzinzuwadia.workers.dev

Public repository: https://github.com/Krishang-Zinzuwadia/campusbridge-placement-portal

Cloudflare Workers: campusbridge-live (Clerk accounts), campusbridge-portal (reviewer demo)

Live version: 45dc7ef1-d047-47d2-8b1e-8b34ca3ae701

Demo version: b44a8253-cddd-415f-bfc4-f78945543d74

D1 binding: DB; separate databases: campusbridge-live-db and campusbridge-portal-db

Verified on 6 October 2026:

- Landing and hero asset return HTTP 200.
- Anonymous workspace data requests return HTTP 401.
- Student login succeeds; role-scoped state contains 6 approved openings and 3 own applications.
- Recruiter login succeeds; role-scoped state contains 3 owned postings and 8 owned applications.
- Admin login succeeds; state contains 9 postings, 12 applications and reviewer-attributed audit records.
- Student attempting the admin review API returns HTTP 403.
- Low-CGPA student attempting an 8.0-CGPA opening returns HTTP 403 with an explanatory notice.
- Hosted cookies include HttpOnly and Secure.
- 55 automated tests pass; TypeScript and production Vite build succeed. Auth, icons, React, and application chunks are separated for caching.
- Browser QA verified application submission and tracking, direct URL role boundary, recruiter batch updates, admin review/audit persistence, mobile width, generated image/font loading, and appearance controls.

Application state uses 15-second polling. Test browser mutations were performed against local D1; deployed demo records retain the initial seed for reviewers.

## Connected Clerk verification

The account owner authenticated Clerk CLI and the existing application was linked. Its development instance has verified email/password signup and Google enabled. The secret key is stored with Cloudflare secrets; the frontend receives only the public key.

A temporary QA identity used the actual Clerk Frontend API ticket flow to obtain a signed session bound to the live Worker origin. The live API verified it, requested role onboarding, created the student account using provider-verified email, persisted profile/skills in D1, returned those values on a fresh request, refused admin review with403, and disabled legacy password login with409. The QA identity/profile were removed afterward.

This connects real external services using the current Clerk development instance. Production Clerk keys require an owned custom domain, DNS configuration, and own Google OAuth credentials.

## UI verification

Confirmed continuous ticker movement, equal-width loop halves, and pause control; twelve sample companies. Confirmed Satoshi/General Sans loading, Phosphor controls, navbar theme toggle, landing-footer removal, icon-only header search with actual results, clickable avatar menu, cleaner sidebar, and no visible Live updates indicators. Skills selector has exactly250 choices; search/selection/save/reload passed, and the complete popover fits a390px mobile viewport without horizontal overflow.
