# CI, linting and Worker deployment

The repository uses GitHub Actions for checks and deployment to its two existing Cloudflare Workers. Deployment automation needs the scoped `CLOUDFLARE_API_TOKEN` secret before it can run successfully. Missing credentials produce an explicit failed deployment step; checks still run without that secret.

## Local checks

Use Node.js 24, matching CI. Supported local Node versions are 22.13+ on the 22.x line or 24+. Install the lockfile and run:

```sh
npm ci
npm run lint
npm test
npm run build
```

`npm run check` runs lint, tests and build in sequence. `npm run typecheck` runs the TypeScript compiler independently. The production build also includes type checking.

ESLint uses the current flat configuration with JavaScript and TypeScript recommended correctness rules plus React's rules-of-hooks. It checks frontend source, Worker modules, shared domain helpers, maintenance scripts, tests and Vite/ESLint configuration. Unused symbols fail lint; callback arguments and defensive catch bindings can be intentionally unused. Existing API/snapshot boundaries retain `any` without a type-style refactor. Hook placement, duplicate/undefined bindings, unreachable code and constant-expression defects remain enforced. The filename sanitizer's intentional ASCII-control-character regex has one explained line-level exception. Generated assets, local Worker state and scratch files are ignored. This configuration follows the [ESLint configuration reference](https://eslint.org/docs/latest/use/configure/configuration-files), [typescript-eslint recommended setup](https://typescript-eslint.io/getting-started/), and [React hook rule](https://react.dev/reference/eslint-plugin-react-hooks/lints/rules-of-hooks).

## GitHub checks

`.github/workflows/ci.yml` runs for pull requests, all branch pushes, manual requests and reusable workflow calls. Each run installs with `npm ci`, validates GitHub workflow files with actionlint, lints application code, tests isolated auth/database/upload fixtures, type-checks and builds. It saves the validated `dist` artifact for seven days. Tests do not contact or seed the deployed databases.

Actions are pinned to verified commit SHAs, with their major version in a comment. Actionlint's official Linux release is also pinned to version 1.7.12 and verified against its published SHA-256 before execution. Dependabot checks the GitHub Action pins weekly; it does not automatically upgrade application dependencies. CI has read-only repository permissions and does not receive Cloudflare credentials. Fork pull requests use the ordinary `pull_request` event; there is no privileged `pull_request_target` workflow.

## Deployment behavior

`.github/workflows/deploy.yml` runs when `main` is pushed and can be dispatched manually from **main**. Its repository/ref guard prevents a fork or non-main manual run from deploying. It calls the same CI workflow and waits for it to pass, then downloads that run's validated build artifact and uses the lockfile's Wrangler CLI. The standalone CI workflow also runs on a main push; this deliberate duplicate check keeps deployment self-contained and prevents relying on a separate run's completion.

Deployment uses the `cloudflare-workers` GitHub environment and serializes runs. An in-progress deployment is allowed to finish; newer runs cannot interrupt it between database migrations and Worker updates. Cloudflare credentials are available only to credential/migration/deployment steps, not dependency-install, build or pull-request jobs. Checkout does not persist its GitHub credentials, and the deployment job does not use a shared dependency cache.

| Order | Target | Operation |
| --- | --- | --- |
| 1 | Demo D1 `campusbridge-portal-db` | Apply pending remote migrations |
| 2 | Demo D1 `campusbridge-portal-db` | Apply idempotent canonical demo credential SQL |
| 3 | Demo Worker `campusbridge-portal` | Deploy default Wrangler environment |
| 4 | Live D1 `campusbridge-live-db` | Apply pending remote migrations with `--env production` |
| 5 | Live Worker `campusbridge-live` | Deploy with `--env production` |
| 6 | Both Worker URLs | Verify expected auth provider, configured uploads and anonymous state denial |

The Worker and database identifiers come from the checked-in `wrangler.jsonc`. Demo credential synchronization runs `scripts/migrate-demo-credentials.sql` against the demo database only, so its published demo sign-ins stay consistent after deployment. The workflow never runs `db:seed` or a demo-credential reset against the live database. Existing Worker runtime secrets, including Clerk secrets, are managed separately and are not copied from GitHub into the application bundle. D1 migrations should be reviewed for compatibility with the currently running Worker before merging.

The targets are [the demo Worker](https://campusbridge-portal.krishangzinzuwadia.workers.dev) and [the live Worker](https://campusbridge-live.krishangzinzuwadia.workers.dev). These are Worker deployments with static assets; the workflow does not provision another hosting product.

## Credential provisioning

Cloudflare's [GitHub Actions guidance](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) requires an API token for noninteractive CI. A local `wrangler login` session is not a durable CI credential. Current [Workers roles](https://developers.cloudflare.com/workers/authorization/workers/) allow a narrower account-owned token:

1. Create a dedicated account-owned token named `campusbridge-github-actions` in the account already identified by `wrangler.jsonc`.
2. Grant **Workers Editor** only for the existing `campusbridge-portal` and `campusbridge-live` Workers. This can update/deploy these Workers without granting Worker creation/deletion access.
3. Add **D1 Edit** for the database migration steps, scoped to this account and the two databases where resource scoping is available. Worker bindings themselves do not require separate resource permissions.
4. This pipeline does not directly manage R2 objects, KV, DNS, routes or custom domains, so do not add those write permissions. If only the legacy token interface is available, Workers Scripts Edit is the legacy equivalent, with broader account-level scope; review that broader scope explicitly before using it.
5. Add the generated token as **`CLOUDFLARE_API_TOKEN`** in GitHub Settings → Environments → `cloudflare-workers` → Environment secrets. A repository Actions secret with the same name also works if environment secrets are unavailable on the account's plan.
6. Restrict that GitHub environment to `main`. Configure required reviewers if deployment approval is desired and supported by the GitHub plan. A workflow's `environment` field does not itself configure these protection rules. [GitHub environment documentation](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments) explains these controls.

The account ID is already in `wrangler.jsonc`; it is not a private token. Never put the Cloudflare token in a committed file, shell command literal, workflow YAML, application environment file or build artifact. The [GitHub secrets documentation](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) covers secure storage. Rotate the dedicated token by replacing the GitHub secret rather than changing workflow code.

## First run and recovery

After the secret and desired environment protections are configured, merge the reviewed changes to `main` or select Actions → Deploy Workers → Run workflow → main. A successful run must show validation, both database/Worker steps and smoke checks passing. If a secret is missing, fix the configuration and rerun; do not treat the workflow files alone as a verified deployment.

If a deployment fails, later steps stop. Demo may already be updated when a later live step fails, so review each step rather than assuming the two targets changed atomically. Database migrations are not automatically rolled back. Fix the failure and rerun from the same reviewed revision, or review a Worker rollback and any schema compatibility separately.

## Verification and outstanding setup

- Workflow syntax, expressions, job dependencies and action inputs were checked with checksum-verified official `actionlint` 1.7.12. Actionlint ran without shellcheck because that separate binary is unavailable on the Windows host.
- The linter was checked against intentional conditional-hook, undefined-backend-global and constant-binary-expression errors; all were rejected by the intended rules.
- The npm lockfile preserves the installed TypeScript 5.9 and Wrangler line. No force audit downgrade or unrelated dependency migration was performed.
- GitHub execution/deployment is not claimed until the new workflows are pushed and a run completes. The repository's Cloudflare deployment secret was reported missing during setup; credential provisioning must complete before CD can succeed.
- `npm audit` currently reports three high-severity entries in the existing Wrangler → Miniflare → sharp development-tool chain. Its suggested automatic fix downgrades Wrangler outside this project's requested range. That downgrade was not applied; review a compatible upstream remediation separately. These entries are not introduced by the lint packages.
