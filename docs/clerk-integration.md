# Clerk and D1 integration

The user selected Clerk for authentication while retaining Cloudflare Worker hosting and D1. This is an authentication subsystem change. Existing demo identities use custom sessions; they remain available in the demo environment. Real accounts use Clerk-verified identity and D1 permissions.

Connected endpoint: https://campusbridge-live.krishangzinzuwadia.workers.dev . Clerk secret configuration, actual origin-bound provider-session verification, D1 onboarding/profile/skills persistence, and permission refusal have been verified. Current Clerk instance: development. See deployment.md for verification details and README.md for production requirements.

## Boundaries

- Clerk owns verified identity, passwords, email verification, social sign-in, and account recovery.
- The Worker validates signed Clerk session tokens and authorized origins.
- D1 owns the application user ID, role, academic profile, company ownership, jobs, applications, and audit records.
- The browser cannot grant admin access or link an existing account by email.
- Initial account onboarding accepts only student/recruiter roles. Admin provisioning is an operator action after a user exists.
- Identity linkage uses the stable Clerk user ID, never an editable email or client metadata.

## Worker configuration

Set `AUTH_MODE=clerk`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_AUTHORIZED_PARTIES` on the Clerk deployment. Store the secret key with Wrangler secrets, never frontend source or checked-in environment files. Authorized parties are a comma-separated list of exact HTTP(S) origins, including the scheme and any port, without path suffixes or wildcards. Use only the deployed production origin for the production environment. Add localhost origins only in a separately configured local environment.

`CLERK_JWT_KEY` is optional: providing the application's PEM public key allows networkless token verification. Without it, Clerk's backend SDK fetches the application's signing keys. The secret key remains required because onboarding retrieves the current provider user.

`GET /api/auth/config` returns only `{provider, publishableKey, enabled}` and works without a D1 binding. `provider` is `clerk` when `AUTH_MODE=clerk`; otherwise it is `demo`. Clerk configuration is disabled when required values are missing or malformed. Protected Clerk requests fail with `503 AUTH_UNAVAILABLE` if configuration is unavailable; the browser must display an unavailable state and must not render demo login as a fallback.

Migrations are additive. Apply every migration, including `0002_clerk_identity.sql`, to both environments before running updated server code. Keep production and demo D1 databases separate. Seed only the demo database. Existing legacy rows retain their IDs, role, profiles, ownership, applications, and audit relationships.

## API contract

- Clerk requests carry the current session token as `Authorization: Bearer ...`. The backend accepts only Clerk session tokens, verifies signatures and expiry through `authenticateRequest`, requires an exact authorized-party claim, and checks the issuer against the configured application's publishable key. A legacy `cb_session` cookie cannot authenticate a Clerk request.
- `GET /api/state` resolves the stable verified Clerk subject to D1 using `clerk_user_id` and `auth_provider='clerk'`. D1 grants the role; token or browser metadata cannot grant permissions. A verified session without a D1 account returns `403` with `code: 'ONBOARDING_REQUIRED'`.
- `POST /api/onboard` accepts `{role: 'student' | 'recruiter', name, company?}`. The backend retrieves the Clerk user with `users.getUser`, checks that its ID matches the verified session, and requires the primary email's provider verification status to be `verified`. It ignores client-provided email, identity ID, academic fields, role metadata, and admin flags.
- Student onboarding creates a profile with the existing academic defaults; applications remain gated until the required profile and eligibility fields are complete. Recruiter onboarding atomically creates an owned company with `pending` review status. Existing company/job approval and hiring permissions remain enforced.
- Repeating onboarding for an existing Clerk subject returns that same account without changing its role or creating another company. A verified-email collision with an existing account returns `409 ACCOUNT_COLLISION`; it never attaches that account by matching email.
- In Clerk mode `/api/login`, `/api/signup`, and `/api/logout` refuse the legacy workflow. Browser sign-out uses Clerk's SDK. In demo mode existing cookie sessions continue to work; Clerk-managed records cannot log in using the legacy password endpoint.
- Mutating API bodies must be JSON objects; `null`, arrays, strings, and malformed JSON return a validation error. Existing same-origin mutation protection applies in both modes.

## Frontend integration

`src/services.ts` exports `api`, `ApiError` (`status` and optional `code`), `loadAuthConfig`, `setAuthBridge`, and `signOut`. The `api` call shape remains `(path, method='GET', body?)`. Re-export this helper from `src/core.tsx` so every application request uses the same token bridge. Tokens are retrieved afresh with Clerk's `getToken()` for each request and are not written to application storage.

Load runtime configuration before choosing authentication UI. In enabled Clerk mode wrap the app in `ClerkProvider` using the runtime publishable key. Mount `ClerkSessionBridge` inside that provider with a stable `onReady(signedIn)` callback. Defer the first state refresh until the bridge reports that Clerk has loaded, and refresh or clear application state when the callback reports session changes.

The bridge installs token resolution and provider sign-out before reporting readiness. Use `ClerkAuthForm` inside the existing sign-in/sign-up shell and pass its `signup` prop. Clerk handles sign-in, Google authentication when enabled in its dashboard, verification, and recovery. Components use hash routing for multi-step provider flows and send successful authentication to `/onboarding`.

Catch `ApiError.code === 'ONBOARDING_REQUIRED'` to render `ClerkOnboarding`. Its `onSuccess` callback should reload `/state` and navigate to the persisted user's role workspace. For an already provisioned user arriving at `/onboarding`, fetch their state and navigate to that existing workspace. Use `services.signOut()` in portal logout, then clear local workspace state. Handle missing configuration or SDK load failure with a visible retry/unavailable state.

## Operator administration

Public onboarding never accepts an admin role. A placement-office operator must review the verified account and promote the exact stable Clerk subject through an authorized database operation. For example, after verifying the operator's identity, the account's existing role, and the correct database, run an update bounded by `clerk_user_id` and `auth_provider='clerk'`; record the operator action separately. No browser control, public API, secret role field, or email-based promotion path is supplied.

## Verification and rollout

Run `npm test` and `npm run build`. The automated tests use generated RSA signing keys, synthetic Clerk subjects, real Clerk SDK token verification, real SQLite schema migrations, and a provider-profile fixture only at the external Clerk HTTP boundary. They cover forged/expired/wrong-origin/wrong-issuer tokens, legacy fallback refusal, safe runtime configuration, onboarding requirements, verified email, email collisions, role persistence, recruiter ownership, and malformed input alongside the original eligibility and audit API tests.

Provision provider settings, apply migrations to the separately configured real-account D1 database, and upload Worker secrets before deployment. Verify role-scoped requests and persistent D1 records with an actual provider session; automated fixture results alone do not prove provider connectivity. Never deploy synthetic RSA signing keys or unit-test provider subjects. Temporary QA records must be removed after live checks.

The verification API follows Clerk's [authenticateRequest reference](https://clerk.com/docs/reference/backend/authenticate-request). No secret is included in runtime public configuration or frontend code.
