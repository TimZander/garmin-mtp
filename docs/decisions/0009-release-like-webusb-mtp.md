---
status: accepted
date: 2026-11-09
decision-makers: the owner (the approval gate, open question 1 of release-to-npm); Claude (copying the rest)
---
# Release to npm with a copy of `webusb-mtp`'s workflow, approved by the owner

## Context and Problem Statement

garmin-mtp had never been published, and `package.json` was `private` until a release route
existed. `webusb-mtp` had just published 0.1.0 with a release workflow that was spec-reviewed,
reviewed twice for conformance, security-reviewed and attack-tested (its ADRs 0009–0013). How should
garmin-mtp release, and should its publish wait for the owner's approval?

## Considered Options

- Publish from the owner's laptop.
- A new workflow designed for garmin-mtp.
- A reusable workflow in ci-recipes, shared with `webusb-mtp`.
- A copy of `webusb-mtp`'s workflow, changing only what names the package, with its approval gate.
- The same copy without the approval gate.

## Decision Outcome

Chosen option: "a copy with the approval gate". The copy keeps a layout that has already been
reviewed and has published once: started by hand on `main`, a check job without credentials, and a
publish job that runs no project code. A new design would have to be reviewed again from nothing.
ci-recipes stays open (open question 2; `webusb-mtp`'s ADR 0011 is still `proposed`). The owner
answered the approval question "yes, same as webusb-mtp" on 2026-11-09, so any run started by a
collaborator or an app, the Claude GitHub App included, publishes only after the owner approves it
in the `npm` environment.

`"private": true` is removed in the same change, because this change is the route it was waiting
for (lift-garmin-core's R1).

### Consequences

- Good, because the two libraries release the same way, and one test file checks each copy.
- Good, because a Claude session can prepare and start a release but can't publish it.
- Bad, because the two copies can drift. The README says a change to one belongs in the other.
- Bad, because a stray `npm publish` from a logged-in checkout could now publish. `prepublishOnly`
  still runs the checks first.

## More Information

Spec: `npm-release`. Open questions 0 (deleting the token needs no workflow change), 2 (ci-recipes),
3 (git tags) and 4 (Node 22) went ahead on their assumptions.
