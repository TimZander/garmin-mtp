## 1. Tests first

- [x] 1.1 Add `yaml` as a dev dependency and `test/releaseWorkflow.test.ts`, copied from `webusb-mtp`'s with the package's name: manual trigger only, publish job guarded to `main` and in the `npm` environment, a check job (install, type check, tests, build, upload `dist`) and a publish job that needs it and runs only an exact npm (≥ 11.5.1) and `npm publish --access public --provenance --ignore-scripts`, nothing that ignores a failure, `contents: read` and `id-token: write` for the publish job alone, SHA pins, `persist-credentials: false`, no cache, `registry-url`, `NPM_TOKEN` only in the publish step, one release at a time, 15-minute jobs, Node 22, no `env`/`printenv`/`set -x`/`--force`/`unpublish`
- [x] 1.2 Tests that `package.json` is `garmin-mtp` and not `private`, and that the README installs with `npm install garmin-mtp`, says nowhere that it isn't published, and has a "Releasing" section naming the version bump, the workflow, the approval, `NPM_TOKEN` and trusted publishing
- [x] 1.3 See them fail before the workflow, `package.json` and README change

## 2. Workflow, package and README

- [x] 2.1 `.github/workflows/release.yml`
- [x] 2.2 Remove `"private": true` from `package.json`
- [x] 2.3 README: an "Install" section and a "Releasing" section; drop the "not published to npm yet" status
- [x] 2.4 Tests, type check and build pass

## 3. Review and records

- [ ] 3.1 Conformance review
- [ ] 3.2 `/security-review` of the diff and an attack test (the workflow handles a secret)
- [ ] 3.3 ADRs and lessons

## 4. Owner, after merge

- [ ] 4.0 Check the `npm` environment (Settings → Environments): required reviewer the owner, deployment branches `main` only
- [ ] 4.1 Before about 2026-11-16 (the token's expiry): run the release on `main` and approve it; add trusted publishing for `garmin-mtp` on npmjs.com (`TimZander/garmin-mtp`, `release.yml`, environment `npm`); delete the token and the `NPM_TOKEN` secret here and in `webusb-mtp`
- [ ] 4.2 The next release, with no secret, publishes through trusted publishing (open question 0)
