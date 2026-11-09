---
status: accepted
date: 2026-11-09
decision-makers: the owner
---
# Error messages keep the app's wording for now

## Context and Problem Statement

The lifted client's `WatchError` messages were written for the map app, some naming a map (for
example "The watch has no GARMIN folder, so the map wasn't sent."). Open question 3 in
`lift-garmin-core`'s design asked whether to keep them.

## Considered Options

- Keep them word for word for now; a later change can make them neutral.
- Make them neutral in this change.

## Decision Outcome

Chosen option: "Keep them word for word", because the app's message table matches on them, so the
app's switch to the library changes nothing its users read. Callers should branch on `kind`, not
on the message.

### Consequences

- Good, because the switch stays a pure refactor for the app.
- Bad, because a few messages mention maps in a library that sends any file.
