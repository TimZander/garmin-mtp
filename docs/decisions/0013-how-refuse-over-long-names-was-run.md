---
status: accepted
date: 2026-11-10
decision-makers: Claude
---
# How `refuse-over-long-names` was run

## Context and Problem Statement

A small bug fix, found while switching garmin-map onto the library, run as a full sdd change after
the owner said "do the garmin-mtp fix after the switch". Learning mode records how it was split and
reviewed.

## Considered Options

- One change for the bug alone, released afterwards as 0.1.2.
- Fold in other name rules (empty names, path separators) while touching the code.
- Fix it in `webusb-mtp` instead.

## Decision Outcome

Chosen option: "the bug alone". Other name rules are behaviour the owner hasn't asked for, and
`webusb-mtp`'s encoder already refuses the over-long string correctly; only garmin-mtp's mapping of
its error was wrong (ADR 0012).

- **Evidence first:** `webusb-mtp` 0.1.0's `session.js` calls `encodeObjectInfo(info)` as an
  argument to its transaction, so the encoder throws before any transfer. The tests confirmed it:
  against the old code, five of six new tests failed with kind `broken` and `partialFile: true`.
- **Spec review, 1 round:** no blocker, 2 should-fixes and 5 considers.
  - B1 and B2: `name-too-long` added to "What a failure leaves of the connection" and to "A failed
    send says whether a partial file may be left", instead of being stated only in the new
    requirement.
  - G1: the refusal's log line was in the design but in no requirement, so it was added to
    "Connecting and sending log their steps".
  - D1, D2 and D3 were taken: the scenario wording ("the send sends no operation"), no progress
    reported, and a message giving the length and the limit.
  - F1 was kept: the unrelated lesson rides in this PR because it is the next one, and the proposal
    says so.
  - Not re-run, since no blocker was found.
- **Conformance review, 1 round:** conforms, no findings. Its mutation probes (`>` to `>=`,
  counting characters, closing the device) each failed a test.
- No security review: the change decides nothing about merges or secrets and runs no untrusted code.

### Consequences

- Good, because the fix is small and its release (0.1.2) is independent of any other work.
- Bad, because other bad names (empty, with a `/`) still reach the watch and fail as it answers.
