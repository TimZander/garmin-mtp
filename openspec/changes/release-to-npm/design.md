## Context

See proposal.md. `webusb-mtp` released 0.1.0 with this workflow on 2026-11-09 (its archived change
`release-to-npm`, ADRs 0009–0013 there), so this change copies a design that has run once, with the
names changed. garmin-mtp's `package.json` already has `files`, `exports` and a `prepublishOnly`
script, and `repository.url` names this public repository, which provenance needs. The name
`garmin-mtp` is free on npm (ADR 0008). The owner says the `npm` environment exists here and the
`NPM_TOKEN` secret is set.

## Goals / Non-Goals

**Goals:** the same release as `webusb-mtp`'s: started by the owner from the Actions tab, approved
in the `npm` environment, first publish with a token, later ones with trusted publishing;
checks before publishing; provenance.

**Non-Goals:** automatic releases, version bumps, changelogs, git tags, GitHub releases; sharing the
workflow with `webusb-mtp`.

## Decisions

- **Copy `webusb-mtp`'s workflow, changing only what names the package.** Its layout was reviewed
  twice for conformance, security-reviewed and attack-tested, and it has published once. Each of its
  decisions carries over for the same reasons:
  - started by hand (`workflow_dispatch`), the publish job guarded by `github.ref ==
    'refs/heads/main'` (webusb-mtp ADR 0009);
  - a check job with `contents: read` that builds and uploads `dist`, then a publish job with
    `id-token: write` that runs no project code: it installs `npm@11.21.1` and runs `npm publish
    --access public --provenance --ignore-scripts` with `NPM_TOKEN` as `NODE_AUTH_TOKEN` (ADR 0010
    there);
  - actions pinned to the same commit SHAs (`actions/checkout` v4.2.2, `actions/setup-node`
    v4.4.0, `actions/upload-artifact` v4.6.2, `actions/download-artifact` v4.3.0), checkouts
    without credentials, no cache;
  - the publish job in the `npm` environment, whose required reviewer is the owner (ADR 0013
    there), and named in npm's trusted publisher;
  - one release at a time, 15-minute jobs, Node 22, plain versions to `latest`.
- **The test is copied too,** with the package's name, and with two checks garmin-mtp needs:
  `package.json` is not `private`, and no line of the README says the package isn't published
  (garmin-mtp has no Install section yet, so the README's whole text is checked).
- **`private` goes in this change, not before.** It was added by lift-garmin-core so that nothing
  published before a release route existed; this change is that route.

## Risks / Trade-offs

- [The two copies can drift] → the test pins the layout in each; sharing it is open question 2.
- [With `private` gone, a stray `npm publish` from a checkout with a logged-in npm would publish] →
  the same as any public package; `prepublishOnly` still runs the checks first.
- [The token sits in the repository's secrets until trusted publishing is set up] → 7-day expiry,
  deleted after the first publish.
- [Anyone or any app with Actions access can start the release, the Claude GitHub App included] →
  the publish job waits for the owner's approval in `npm`.

## Open Questions

0. **Does deleting `NPM_TOKEN` need no workflow change?** npm 11.5.1+ tries OIDC before
   `NODE_AUTH_TOKEN` (from memory), and an empty secret leaves an empty token in `.npmrc`; neither
   library has released without the token yet. *Assumption:* yes; the second release, after the
   token is deleted, checks it (task 4.2).
1. **Require the owner's approval before publishing?** *Assumption:* yes, as in `webusb-mtp`, where
   the owner answered it (its ADR 0013); the owner has created the `npm` environment here, which
   the assumption rests on. It is recorded as an assumption until the owner confirms it for this
   repository.
2. **Share the workflow through ci-recipes?** *Assumption:* not now, as `webusb-mtp`'s ADR 0011
   recommends (still `proposed` there): revisit once both libraries have released.
3. **Tag the released commit from the workflow?** *Assumption:* not now; it needs `contents:
   write`.
