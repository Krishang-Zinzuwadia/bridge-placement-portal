# Release verification — 7 October 2026

The role review findings are resolved and independently retested. Detailed evidence is in [student](qa-student.md), [recruiter](qa-recruiter.md), and [admin](qa-admin.md) reports. Browser limitations and retained mock fixtures are recorded explicitly.

- `npm test`: 75 passed, 0 failed.
- `npm run build`: TypeScript and Vite succeeded; the PDF renderer and its worker are separately loaded assets.
- Actual live Clerk/R2 verification: PDF/image bytes round-trip correctly; anonymous downloads denied; spoofed PDF rejected; provider/custom avatar and profile persistence confirmed; temporary QA identity and objects removed.
- Reviewer demo browser: native PDF-only picker, actual R2 upload, PDF.js rendering, save/reload, tracking, search, and wrong-role redirects passed.
- Recruiter browser: zero-CGPA editor, candidates/search/filters, private submitted PDF, batch selection/dialog/submission and updated stages passed against local mock fixtures.
- Admin browser: approvals/rejections/reasons/gates, logs and filters, wrong-role/unknown routes, photo upload, logout/back protection and light/dark themes passed. At 390 × 844, drawer focus trapping, Escape/focus restoration, navigation, filter reset, contained table scroll, search and account controls passed.
- Dependency audit: no production dependency advisories. The local Wrangler/Miniflare toolchain audit still reports three transitive advisories through its image-processing dependency; these tools are not bundled into the deployed Worker. No forced downgrade was applied.

Deployment versions:

| Environment | Worker version |
| --- | --- |
| Reviewer demo | `8d8e1fa4-57a4-4582-9404-a8a955436d51` |
| Real-account app | `12b3f00f-a218-4825-87c2-8042a3d536ac` |

The connected Clerk application is still a development instance. Live D1 contains the explicitly requested illustrative sample records. Mock passwords apply only to the reviewer demo. This release does not provision real institutional admin accounts or claim a complete production Clerk-domain launch.
