---
status: accepted
date: 2026-11-09
decision-makers: the owner
---
# The app's build marker leaves the library

## Context and Problem Statement

The app tells its own maps apart by an area name it writes into every map record, and its
`isBuiltByApp(info)` compared with that value. A library can't know an app's marker. This was open
question 2 in `lift-garmin-core`'s design; the owner accepted the assumption below.

## Considered Options

- `carriesMarker(info, marker)`, and `mapOrigin(info, file, files, marker?)` returning `'marked'`
  instead of `'app'`, only when a marker is passed.
- Keep the app's marker as a library constant.
- Drop the marked origin and leave marker checks to the app.

## Decision Outcome

Chosen option: "`carriesMarker` and `'marked'`", because it keeps the rule (every map record carries
the marker) in the library while the value stays the app's. The app passes its own marker when it
switches.

### Consequences

- Good, because no app's identity is built into the library.
- Bad, because the app must rename `'app'` to `'marked'` when it switches.
