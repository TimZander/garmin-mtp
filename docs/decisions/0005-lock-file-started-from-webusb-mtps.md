---
status: accepted
date: 2026-11-09
decision-makers: Claude
---
# The lock file started from webusb-mtp's

## Context and Problem Statement

`npm install` with Node 22's npm 10.9 crashed resolving vitest 4's peer dependencies
(`Cannot read properties of null (reading 'edgesOut')`), as `webusb-mtp` found (its ADR 0007).

## Considered Options

- Start from `webusb-mtp`'s lock file (written with npm 11, the same dev dependencies) and let npm
  10 add `webusb-mtp` to it.
- Write the lock with `npx npm@11 install`.
- `legacy-peer-deps`.

## Decision Outcome

Chosen option: "Start from `webusb-mtp`'s lock", because npm 10 then installs without crashing, a
clean `npm ci` passes, and the two libraries resolve the same dev tool versions.

### Consequences

- Good, because CI needs nothing special.
- Bad, because a fresh lock written with npm 10 may crash again; use `npx npm@11 install`.
