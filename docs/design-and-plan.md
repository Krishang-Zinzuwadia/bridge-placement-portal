# CampusBridge design and execution plan

The user approved the feature and UI plan and requested implementation, a landing page, and deployment to their Cloudflare Worker. Hosting choice overrides the earlier Sites default. Implement inline in this session.

Visual direction: warm ivory, forest green, lime accents, oversized Manrope display type and DM Sans body text. Landing composition uses original SVG bridge artwork and floating opportunity cards. Portals use a dark sidebar, generous spacing, actionable metrics, tables and role-specific content. Support 375px through desktop, keyboard interaction, reduced motion, form labels and state feedback.

Architecture: React/Vite frontend, native Cloudflare Worker API, persistent D1 database. HTTP-only server sessions; server role authorization and recruiter ownership for every mutation. Student data contains only approved opportunities and their own applications. Backend enforces minimum CGPA, departments, resume, deadline and duplicate application checks. Admin approvals append an audit record in a database batch. Batch hiring transitions validate all requested candidates before applying updates. Poll state every 15 seconds.

- [ ] Backend: meaningful eligibility and authorization tests first; schema, demo population, authentication, signup and role-scoped state; profile and company edits; job submission, application gating, review and hiring mutations.
- [ ] Landing and entry: editorial homepage, product overview, role explanation, working anchors, login and student/recruiter registration, demo account shortcuts.
- [ ] Student workspace: dashboard, opportunities with search/filter/save, job details, applications and timelines, profile editor.
- [ ] Recruiter workspace: dashboard, company editor, posting list/editor, searchable applicants, candidate details, single/batch transitions.
- [ ] Admin workspace: dashboard, company and job review queues/detail pages, applications overview and searchable audit log.
- [ ] Verification: unit tests, TypeScript/build, HTTP integration checks for authenticated and unauthorized routes, browser QA at desktop/mobile. Apply local and remote schema, seed demo data, deploy a new Worker without modifying unrelated resources, verify live endpoint, package source with README.

Review focus: terminal and mixed batch status handling; company approval before posting visibility; edit/reapproval behavior; missing/expired sessions; direct URL role boundaries and mobile navigation. The API is authoritative; client guards are only navigation aids.
