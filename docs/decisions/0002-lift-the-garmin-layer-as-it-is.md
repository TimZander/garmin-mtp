---
status: accepted
date: 2026-11-09
decision-makers: the owner, Claude
---
# Lift the app's Garmin layer as it is, in three capabilities

## Context and Problem Statement

The map app's Garmin-specific code (known watches, the watch client, the IMG header reader and the
Garmin vendor id) already ran on the four MTP modules that `webusb-mtp` now holds. `garmin-mtp`
needed that code and a spec of what it does, without new behaviour.

## Considered Options

- Lift the code as it is, onto `webusb-mtp`, and specify it in three capabilities by what each
  answers: `watch-choice` (which device), `garmin-folder` (the connection and its file operations),
  `img-headers` (what a map file is).
- Redesign the API while lifting it (an object per watch, events instead of callbacks).
- One capability for the whole library.

## Decision Outcome

Chosen option: "Lift as it is, three capabilities", because the app can then switch to the library
with its message table and tests intact, and the header reader needs no USB, so it stands apart.
Only imports and comments change (comments lose the app's issue numbers and dialog names); error
messages stay word for word (open question 3 in the change's design is still open). Two small
exports were added, `GARMIN_VENDOR_ID` and `isGarminDevice`, and the tests run against a copy of
`webusb-mtp`'s fake device, since that package doesn't ship its tests.

### Consequences

- Good, because the app's tests carried over almost unchanged and found nothing to fix but one gap.
- Good, because each capability can be read on its own.
- Bad, because the app and the library hold two copies until the app switches.
