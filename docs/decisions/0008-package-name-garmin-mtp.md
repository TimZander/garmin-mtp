---
status: accepted
date: 2026-11-09
decision-makers: the owner
---
# The npm package is `garmin-mtp`, unscoped

## Context and Problem Statement

The library needs a name on npm before its first release. Open question 4 in `lift-garmin-core`'s
design proposed one.

## Considered Options

- `garmin-mtp`, unscoped, matching the repository.
- A scoped name, such as `@timzander/garmin-mtp`.

## Decision Outcome

Chosen option: "`garmin-mtp`, unscoped", because it matches the repository and `webusb-mtp`, which
is unscoped too, and the name is free on npm.

### Consequences

- Good, because the install name, the repository and the import are the same word.
- Bad, because an unscoped name says nothing about who publishes it; the package's repository
  field does.
