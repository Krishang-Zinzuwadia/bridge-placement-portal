# Private resume and profile-photo uploads

The Worker uses the private R2 binding `UPLOADS` for bytes and D1 for ownership, type, size, and immutable file IDs. Apply `0004_uploads.sql` to each deployment database before running the updated Worker. Bind the intended R2 bucket to `UPLOADS` in that environment. Keep R2 public access disabled; files are served only by the authenticated Worker route.

`GET /api/auth/config` includes `uploadsEnabled`. When storage is absent, upload/download routes return `503` with `code: 'UPLOADS_UNAVAILABLE'`. The frontend should disable file picking with a visible storage-unavailable explanation until this capability is enabled. Provider photos remain available without R2.

## Request contract

- `POST /api/resume`: student-only multipart form data with exactly one `file`. Accepts `application/pdf`, a `.pdf` filename, a PDF header and EOF marker. Maximum file size: 5 MiB.
- `POST /api/avatar`: any authenticated application role, same multipart field. Accepts JPEG, PNG, or WebP with matching MIME and magic bytes. Maximum file size: 2 MiB. SVG is rejected.
- Successful uploads return `{url, filename, size, type}`. `url` is an absolute URL on the same Worker origin, `/api/uploads/<immutable-id>`.
- `GET /api/uploads/:id`: authenticated file access. Owner and admin may read it. A recruiter may read it only when an application to their owned company contains the exact immutable URL in its student snapshot (`resume` or `avatar_url`) and belongs to the file owner. A candidate's newer replacement is not implicitly shared.

Use the existing auth token resolver to attach `Authorization: Bearer ...` for requests and retain same-origin credentials. Send `FormData` directly; do not set its Content-Type manually, because the browser supplies the multipart boundary. The frontend fetches private files with a fresh token and creates a local object URL; it revokes that URL when the preview closes, the component unmounts, or the photo changes. The PDF preview uses a lazy-loaded self-hosted PDF.js worker and offers page navigation plus a download link. It does not require popups or a browser PDF plugin. Never put JWTs in image URLs, query parameters, or application storage.

## Persistence and replacement

Resume upload stores bytes and metadata but does not change `users.resume`. The profile form should keep the returned URL and submit it with the normal `PUT /api/profile` save. The server checks managed references for ownership and resume type. Legacy external HTTP(S) resume URLs remain compatible with existing records.

Avatar upload stores the immutable version and atomically updates `users.avatar_url` and `avatar_source='upload'` in the D1 transaction. Refresh application state after success. Older objects remain available for existing application snapshots; uploading another file never mutates or deletes an earlier version.

On Clerk onboarding, the verified provider profile's HTTPS `imageUrl` becomes the default avatar. An existing linked account with an empty provider avatar synchronizes on state load. A conditional D1 update protects a custom image uploaded concurrently; provider refresh never replaces `avatar_source='upload'`.

Uploads authenticate before reading multipart data. Actual request streams are capped at the file limit plus 64 KiB of multipart overhead, including when Content-Length is absent. MIME and magic-byte checks happen before an R2 write. Database failure deletes the just-created object; avatar metadata and user changes use one transaction. Files have private/no-store cache headers, the validated Content-Type, inline Content-Disposition, and `nosniff`.

## Verification

`npm test` covers storage absent/present behavior, authentication and role checks, spoofed file types, file and stream limits, same-origin mutations, immutable versions, owner/admin/recruiter access, profile ownership validation, rollback, provider-image import, and the provider/custom-avatar race. Tests use real SQLite migrations and a fake R2 object store at the external storage boundary. Real R2 activation, bucket binding, uploads, authenticated retrieval, and deployed UI verification remain deployment checks.
