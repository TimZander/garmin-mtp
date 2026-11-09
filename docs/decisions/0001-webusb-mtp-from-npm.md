---
status: accepted
date: 2026-11-09
decision-makers: the owner
---
# Depend on webusb-mtp from npm

## Context and Problem Statement

`garmin-mtp` is built on `webusb-mtp`. While the change `lift-garmin-core` was written,
`webusb-mtp` wasn't on npm, so its design assumed a git dependency pinned to commit `994e993`,
with a path alias to the package's source (open question 1). `webusb-mtp` 0.1.0 has since been
published.

## Considered Options

- A git dependency pinned to a commit, with a path alias to `src/index.ts`
- npm `^0.1.0`, resolved through the published `dist` and declarations

## Decision Outcome

Chosen option: "npm `^0.1.0`", because the package is published. The library is then built and
tested against the same `webusb-mtp` its users install, and the alias and git `prepare` step go.

### Consequences

- Good, because the build needs no path alias and no git install script.
- Good, because the tests run against `webusb-mtp`'s published build.
- Bad, because a fix in `webusb-mtp` reaches this library only after `webusb-mtp` releases it.
