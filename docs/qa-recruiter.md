# Recruiter QA review

Reviewed commit `06f0c24` on `feat/role-reviewed-uploads`, 2026-10-07, against the local Worker at **http://localhost:8787**. All mutations used disposable local mock records. No deployed application data, source code, deployment, or commits were changed by this reviewer.

## Resolution review

The parent implemented fixes after the initial review. This reviewer inspected the updated source and independently ran `npm test`: **74 passed, 0 failed**. The non-idempotent local fixture scripts were not rerun. The parent reports a successful fresh production build; this resolution review did not repeat that build.

| Finding | Resolution and evidence |
| --- | --- |
| Zero CGPA replaced with seven | Fixed with `existing?.min_cgpa ?? 7`, preserving zero and defaulting only for null/undefined. Source verified; parent browser confirmation remains pending. |
| Invalid calendar deadlines accepted | Fixed with shared `isOpenDeadline`: finite timestamp, exact ISO date round trip, and future/end-of-day check. Both posting creation/edit and application submission use it. The fresh 74-test suite includes malformed/impossible-date regressions. |
| Current/submitted candidate names mixed | Fixed by deriving applicant-list name/email from the submission snapshot before filtering/export, and using snapshot name in the candidate heading. Candidate avatar also uses the snapshot's image reference. Source verified; parent browser confirmation remains pending. |

The additional source-only duplicate-submission risk was also addressed: both posting actions now use `disabled={busy}`. Their respective busy indicators remain associated with the chosen action. No new issue was found in these fixes.

## Coverage and limitation

**37 checks passed** across three executable local HTTP/source checks. Recruiter demo login was used for the recruiter flows. Tests used cookie sessions, real Worker endpoints, D1 state, and local R2 uploads. Cookie values were not printed or saved.

Actual browser interaction was unavailable in this child session: `cua.createBrowserTab('iab', ...)` and browser ID `2` both returned “Browser is not available”; `cua.listBrowsers()` returned an empty list. The parent authorized HTTP API QA as the fallback and will supply browser coverage. No alternative browser technology or viewport changes were used. Typography, light/dark appearance, native file-picker operation, search interaction, back links, download initiation, and wrong-role **UI redirects** are source-reviewed but are **not claimed as browser-tested here**.

## Initial findings, now fixed in source

### Resolved P2 — Stored minimum CGPA zero becomes seven in the posting editor

- Evidence: a complete draft with `min_cgpa: 0` was accepted and returned by `/api/state` with zero. `src/Recruiter.tsx:9` initializes the editor with `existing?.min_cgpa || 7`, which evaluates to seven for that valid stored value.
- Reproduction: sign in as the recruiter demo and open `/recruiter/postings/8ab390df-3277-47f3-9a6b-0008854272ec` (“QA Recruiter 20261007 Zero CGPA retained”). Inspect Minimum CGPA, then save without changing it.
- Expected: zero remains zero, so the opening does not acquire a stricter academic requirement.
- Actual: source initialization sets seven; saving sends that changed value. Parent browser confirmation is still required.
- Proposed fix: use `existing?.min_cgpa ?? 7`; cover zero in the editor initialization check.
- Resolution: the proposed nullish fallback is implemented and source-reviewed. Parent browser confirmation remains outstanding.

### Resolved P2 — Posting API accepts nonexistent calendar deadlines

- Reproduced through the running Worker: POST `/api/jobs` with all valid posting fields and `deadline: "2026-99-99"` returned **200**, and the posting state stored that deadline.
- Fixture: “QA Recruiter 20261007 Invalid calendar date,” a disposable local draft.
- Expected: **400** with the existing invalid/future-deadline validation message.
- Actual: `worker/index.mjs:97` checks the string pattern, then compares a `NaN` timestamp with the current time. The comparison is false, so validation permits the invalid date.
- Proposed fix: require a finite parsed date and verify its UTC year/month/day exactly match the submitted date before the future check. Include invalid month and impossible day cases.
- Resolution: shared finite/calendar-round-trip validation is implemented for posting writes and application submission. Fresh regression suite passes.

### Resolved P2 — Candidate page mixes the current name with the submitted name

- Reproduced through local API data: renamed the owned mock student Ishaan Rao to “QA Snapshot Rename Ishaan,” then fetched recruiter state. The application returned `student_name: "QA Snapshot Rename Ishaan"` while its immutable snapshot still contained `name: "Ishaan Rao"`. The original student name was restored in a `finally` block.
- Reproduction: apply under one name, edit the student profile name, then open that candidate detail as the recruiter.
- Expected: the submitted-profile presentation consistently identifies the candidate using the submission snapshot, matching the page's snapshot explanation.
- Actual: `src/Recruiter.tsx:16` uses the live `a.student_name` for the page heading and snapshot `p.name` for the candidate introduction. Applicant lists also use the live name. Parent browser visual confirmation remains outstanding.
- Proposed fix: use snapshot name/email consistently in submitted-profile UI; if current identity is useful, display it explicitly as a separate current-account field.
- Resolution: applicant list/search/CSV and candidate heading now use snapshot identity; snapshot avatar display was also added. Source review confirms the mismatch is removed. Parent browser confirmation remains outstanding.

## Successful coverage

| Area | Verified behavior |
| --- | --- |
| Session and scope | Recruiter demo login; recruiter-owned companies/jobs/applicants only; logout makes the same session return 401. |
| Role boundaries | Recruiter student-profile update and admin-review mutation return 403; outside-company job edit returns 404. |
| Posting lifecycle | Complete draft creation; structured skills and zero CGPA persist; edit and submit enters pending review; save draft; close own QA posting; empty departments rejected. |
| Company profile | Invalid `javascript:` website rejected without mutation. Isolated mock recruiter company edit persists name, industry, website, location, description and pending review status. Layers stayed approved during these checks. |
| Hiring stages | Single Applied → Shortlisted; same-stage batch → Interview; history stores stage and note; skip-stage and terminal changes return 409; mixed unauthorized batch returns 403 with no partial update. |
| Avatar upload | Recruiter PNG upload persists `avatar_url` and upload source; own authenticated fetch returns matching image bytes and private/no-store headers; anonymous read returns 401; wrong MIME, invalid signature and >2 MiB file rejected. Recruiter resume upload returns 403. |
| Submitted resumes | Created a mock student with a private PDF and applied to Full Stack Developer. Recruiter receives and retrieves the submitted PDF. Later profile replacement does not change its application snapshot; recruiter can still access the original but cannot fetch the later unsubmitted PDF. Unrelated recruiter returns 403; anonymous fetch returns 401. |
| Seeded resumes | The seeded Ishaan submitted-resume demo document resolves with status 200 and the expected candidate content. |
| CSV | Executed the source serializer with mock rows: newline-separated rows and quoting for commas are correct. Browser download initiation and spreadsheet rendering remain untested here. |
| Snapshot data | Academic and profile snapshot remains unchanged after later student-name edits; the inconsistent current-name presentation is reported above. |

## Source-reviewed UI controls

The recruiter overview, company form, posting status tabs, required posting fields, skills picker, draft/review controls, approved-opening close control, applicant search/posting/stage filters, single/batch stage dialogs, candidate back links, submitted-resume link, CSV action, account/photo controls, navbar search, notifications, theme toggle, mobile drawer, account signout and wrong-role redirects were inspected. Existing review-feedback banners use the posting/company `reason` field. Actual visual/button operation, light/dark typography, review feedback after an administrator decision, search dismissal, and native image-picker behavior need the parent browser pass.

The initial source-only duplicate-submission risk was not browser-reproduced; the parent nevertheless added `disabled={busy}` to both posting actions. This fix was source-reviewed in the resolution pass.

## Disposable state changes and parent browser fixtures

- Main posting lifecycle fixture: `1315fecb-a46c-4972-9b2b-441595983d20`, now closed.
- Zero-CGPA draft for browser confirmation: `8ab390df-3277-47f3-9a6b-0008854272ec`.
- Owned seeded candidates `a-ishaan-full` and `a-diya-full` advanced to Interview; all seeded demo/design candidate stages were left untouched.
- Recruiter demo photo changed to the harmless supplied `work/upload-check.png`.
- Isolated company-edit fixture: `49c8b121-93fe-4f3d-830f-e9c706795216`, pending.
- Private submitted-resume candidate detail: `/recruiter/applicants/4f9f9f90-c1dc-48da-a68d-92ac0ab8abd5`, named “QA Recruiter Resume Candidate.” Its original uploaded PDF remains in the application snapshot after the mock student's later replacement.
- Mock student and unrelated recruiter accounts created for private-file permission checks; their sessions were logged out.

## Evidence files

- `work/qa-recruiter-api.mjs` and `work/qa-recruiter-api-results.json`: 19 passing checks and the CGPA/deadline findings.
- `work/qa-recruiter-uploads.mjs` and `work/qa-recruiter-uploads-results.json`: 11 passing checks and name/snapshot evidence.
- `work/qa-recruiter-private-resume.mjs` and `work/qa-recruiter-private-resume-results.json`: 7 passing submitted-PDF/permission checks.

Scripts mutate disposable state and are **not idempotent**. Do not rerun the stage-transition script after its fixtures have advanced without resetting local fixture state.

## Final parent browser verification

The parent used the actual compiled app at localhost:8787. Recruiter quick login reached `/recruiter`; the overview, sidebar, posting form, applicant table, and candidate page were visually inspected in light appearance. The zero-CGPA fixture's actual Minimum CGPA input value was `0` after reopening. Applicant search and posting/stage filters routed to the expected records. The candidate title and submitted introduction agreed on the snapshot name.

The submitted private PDF rendered its text in the new self-hosted PDF.js workspace modal. Escape closed the preview and returned focus to its link. The download link is present; the in-app automation did not expose a completed filesystem download event, so that filesystem result is not claimed. [PDF preview evidence](qa-resume-preview.jpg).

The parent selected the local Ishaan/Diya Full Stack Developer fixtures at Interview, opened the batch dialog, confirmed only Offered/Rejected were available, submitted Offered with a note, and verified both candidates appeared under Offered afterward. This advances those two disposable local fixture stages beyond the child run. No real-account live candidate records were changed. The final backend suite has 75 passing tests.
