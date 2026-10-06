# Student role QA

Reviewed baseline commit: `06f0c24` on `feat/role-reviewed-uploads`.
Date: 7 October 2026 (Asia/Calcutta).
Deployed API target: https://campusbridge-portal.krishangzinzuwadia.workers.dev.

## Scope and evidence

This review combined a read-only source audit, actual authenticated HTTP requests to the deployed demo, and browser observations supplied by the parent reviewer. The child CUA runtime reported `apps: [], browsers: []`; selecting the demo origin returned “No browser is available” and creating an IAB tab returned “Browser is not available: iab”. No alternative browser automation was used. Browser evidence below is attributed to the parent, rather than claimed as child execution.

The run recorded 40 passing core checks: 39 assertions using deployed API responses and one local catalog-count/uniqueness assertion. Fixtures were the existing `student@campusbridge.demo` account and one newly created disposable account, `qa-student-upload-20261006190857@campusbridge.demo`. The existing demo profile, skills, provider photo and saved state were restored after temporary edits. One authorized application to `j-product` remains as test evidence. The disposable account retains its harmless test PNG avatar. Small test PDF uploads remain in storage; no personal files or real accounts were used. Both test sessions were logged out, and the stale local cookie file was removed.

## Findings

### P2 — Expired openings still count as eligible and show an eligible badge (resolved)

Status: resolved in the current source and independently retested by the child reviewer. The original issue was source-reproduced; no expired opening was introduced into the deployed database.

Paths: `src/core.tsx:29`, `src/Student.tsx:10`, `src/Portal.tsx:103`.

Reproduction:

1. Use a student with CSE department, CGPA 8.6 and a resume.
2. Supply an approved job with CSE eligibility, minimum CGPA 7 and a past deadline (the focused reproduction used `2020-01-01`).
3. Render the actual `Eligibility` component under its application context. Its React server-rendered output is `<span class="eligibility yes"> You’re eligible</span>`.
4. Inspect the opportunity “Eligible for me” predicate and overview eligible count: they use CGPA, department and resume, without a deadline condition.

Expected: expired openings must not be promoted as eligible opportunities. If kept visible for context, cards should say applications are closed and the eligible count/filter should exclude them.

Baseline actual: card badges, eligible filtering and the dashboard can promote expired approved jobs; the detail page disables Apply and the API correctly rejects expired applications. This creates a misleading card-to-detail transition.

Proposed fix: share an explicit deadline/open-status predicate across card badges, browse filters, dashboard counts/recommendations and detail eligibility. Keep the server-side deadline check. Verify with matching-profile expired and future jobs.

Resolution: `shared/deadline.mjs` now supplies the same `isOpenDeadline` helper to the backend and student eligibility views. A fresh render of the actual `Eligibility` component returns `<span class="eligibility no"> Applications closed</span>` for the original expired fixture; a matching future-deadline fixture still returns “You’re eligible”. The child also verified that a noncanonical date (`2026-02-30`) is closed, the current UTC date is open, and browse/dashboard predicates include `isOpenDeadline(j.deadline)`. The parent reported 75 passing suite tests, including deadline cases. Deployment/browser confirmation of this expiry presentation remains with the parent.

### P3 — Dark overview date chip had weak readability

Status: parent browser reproduced at the reviewed baseline; addressed in the current working source, awaiting deployed visual recheck.

Paths: date chip in `src/Portal.tsx` and date-chip rules in `src/style.css` / `src/typography.css`.

Reproduction: sign in using the Student quick demo, enable dark appearance and inspect the date chip beside the overview heading.

Expected: a readable date at the workspace text scale, with an appropriate dark surface and contrast.

Actual reported by parent: the chip retained a light background with very small pale text while the surrounding workspace was dark.

Proposed fix: explicit dark date-chip surface/text/border and readable type sizing. Current working `typography.css` now contains a 12px `.portal .date-chip` rule and a dark override; verify this after deployment instead of treating it as an unresolved duplicate.

## Passing deployed API coverage

- Demo student login and role-scoped state; anonymous state denied with 401.
- Student company editing, approval actions and hiring-stage updates denied with 403.
- Saving an approved opening, persistence in `/api/state`, unsaving, and restoration of the original saved state.
- A minimum-CGPA-9 opening rejects the CGPA-8.6 student with a specific eligibility message.
- Unknown skills and out-of-range CGPA rejected; the catalog contains exactly 250 unique names; all 250 selections save and round-trip without truncation.
- Wrong resume MIME and non-PDF extension rejected; a PDF masquerading as a PNG avatar rejected.
- A real 611-byte harmless PDF uploaded successfully, attached through profile save, round-tripped in user state and downloaded by its owner with `application/pdf`.
- Private file responses retain `no-store`, `private`, `nosniff` and an inline filename; anonymous access is denied.
- Files above the 5 MiB PDF and 2 MiB avatar limits rejected with 413 and clear messages.
- Positive `j-product` application persisted with Applied history and a profile snapshot; retry rejected with 409.
- Harmless PNG upload automatically persisted the disposable student's avatar URL and `avatar_source=upload`; the owner can fetch it with `image/png`.
- A different student cannot read either the QA avatar or the existing demo student's PDF (403).
- Both demo and disposable-account logout succeeded; their next state request returned 401.

## Parent browser coverage

The parent reviewer supplied the following actual browser observations:

- Student quick demo login reached `/student`; dark overview had clean sidebar/header layout and a Satoshi 38px heading, with labeled search, theme and account controls.
- Header search for “Machine” navigated to `/student/opportunities?search=Machine` and showed only the Machine Learning Intern opening.
- The detail page showed CGPA 8.6 versus minimum 9, disabled Apply and a working Update profile route.
- Profile skills exposed 250 checkboxes; searching “React” produced one result; checking it produced a selected chip and dirty indicator; Done closed the dropdown.
- Account menu opened and exposed Change photo, My profile and Sign out.
- Resume input accept filters permitted PDF; photo inputs permitted JPG/JPEG, PNG and WebP.
- The new `j-product` application tracking detail displayed the Applied timeline stage and the correct submitted-profile snapshot.

## Remaining browser coverage

The child could not independently verify continuous ticker motion/seam/pause, landing anchor navigation, native file-dialog behavior, browser PDF rendering, all browse filters, saved-card buttons, eligible apply confirmation/focus handling, wrong-role route redirects, browser logout, light/mobile layout, or reduced-motion behavior. HTTP success does not establish these browser behaviors. The parent retains browser ownership for those checks; no shared viewport dimensions were changed by this reviewer.

## Source review notes

The ticker duplicates an equal-width noninteractive group with `aria-hidden` on its copy, uses measured linear timing, provides hover/focus pause and reduces to a single static scrollable group for reduced motion. The skills selector uses native checked inputs, live result counts, search, removable chips, arrow/Home/End navigation and Escape/Done focus restoration. Managed file URLs are restricted to the same origin before authenticated fetches; object URLs are revoked on cleanup. The final resume UI uses an authenticated, self-hosted PDF.js workspace preview instead of a popup. These are source observations, not substitutes for browser validation.

## Final parent browser verification

After deployment of the fixes, the parent verified the live ticker's computed transform changing from approximately -1.4 px to -1028 px, with the `company-drift` animation active. The loaded landing hero and Why/How/Campus labels were inspected. The dark overview date chip now has a dark surface and readable date text.

The deployed student's native resume chooser rejected a PNG with “Choose a PDF resume (.pdf).” A valid harmless PDF showed uploading feedback and disabled Save during transfer, then the filename and success notice. The authenticated PDF.js preview visibly rendered its text; Back to workspace closed it. Save my profile persisted the new resume URL across a full reload. This changes only the mutable reviewer demo student's current resume; existing submitted snapshots remain unchanged. See [deployed PDF evidence](qa-resume-deployed.jpg).

Direct student navigation to `/recruiter` redirected to `/student`. The tracking detail for the newly added product application showed Applied and the correct submitted profile. All 75 automated backend tests pass. The admin report records direct shared-shell mobile checks; the child-specific limitations above are preserved for attribution.

