---
status: accepted
date: 2026-11-09
decision-makers: the owner, Claude
---
# How `lift-garmin-core` was run

## Context and Problem Statement

The change was written while `webusb-mtp` wasn't on npm, across two sessions, from a private app's
code into a public repository.

## Considered Options

- Apply on the git dependency, then switch to npm in a later change.
- Wait for `webusb-mtp` 0.1.0 on npm, then switch the design and apply once.

## Decision Outcome

Chosen option: "Wait, then apply once", because the owner published `webusb-mtp` 0.1.0 before the
apply, so ADR 0001 replaced the git pin and its path alias before any code was written. The spec
review ran 2 rounds (round 2 had no blocker). The apply wrote the tests first and saw all 76 fail
with no code. The conformance review ran once: two hard gaps (a header-read test that never failed
a read, and C2, see ADR 0004) and two soft ones (a chooser test that couldn't tell, and an empty
model the spec didn't state), all fixed through `/sdd:spec-fix`. At the owner's request a second conformance round ran: no hard
fails, eight soft gaps (untested clauses on the `GARMIN` folder, `.img` matching, the name read
back and Garmin mode's vendor check; unstated log lines, `mismatch` state and a reopen timeout; and
a package that could be published by hand). They were closed with spec scenarios, tests checked by
mutation, and `"private": true` until a release change. Attaching the private app's
repository was first refused by the session's classifier and then done at the owner's request.
The diff was scanned for private material before the PR.

### Consequences

- Good, because the library was built and tested against the published `webusb-mtp`.
- Bad, because the round-2 fixes weren't reviewed by a third round; each new test was checked to
  fail when its rule is removed.
