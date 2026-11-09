## Why

garmin-mtp is ready for npm but has never been published, and its `package.json` is marked
`private` so that nothing publishes it by accident. The owner wants to release it the way
`webusb-mtp` is released: started from GitHub, checked, published with provenance, and with the npm
credential on no machine but GitHub's. The npm token made for the first publish expires around
2026-11-16, so the first release must run before then or the owner makes a new token.

## What Changes

- Add a release workflow, copied from `webusb-mtp`'s, started by hand from the Actions tab on the
  default branch. A check job installs, type-checks, tests and builds; a publish job, gated by the
  `npm` environment's approval, publishes that build to npm publicly and with provenance.
- It authenticates with npm's trusted publishing (GitHub's OIDC) when the package has it set up,
  else with the `NPM_TOKEN` repository secret, so the first publish uses the short-lived token and
  later ones need no token at all.
- Remove `"private": true` from `package.json`.
- A test that reads the workflow file and checks what it may do: the trigger, the branch, the
  approval, the permissions, the pinned actions and where the secret reaches; and that
  `package.json` is publishable.
- An "Install" section (`npm install garmin-mtp`) replaces the README's "not published to npm yet"
  status, and a "Releasing" section says how a release is made.

## Capabilities

### New Capabilities

- `npm-release`: how a version of the library gets from the default branch to npm.

### Modified Capabilities

None.

## Impact

- New `.github/workflows/release.yml` and `test/releaseWorkflow.test.ts`; `yaml` as a dev
  dependency (already in the lock file through OpenSpec).
- `package.json` loses `"private": true`: from the merge on, `npm publish` from any checkout would
  publish. The release workflow is the intended route.
- The owner has made the `npm` environment and the `NPM_TOKEN` secret. After the first publish they
  add trusted publishing on npmjs.com and delete the token.
- Not in scope: version bumps, changelogs, git tags or GitHub releases; a workflow shared with
  `webusb-mtp` through ci-recipes.
