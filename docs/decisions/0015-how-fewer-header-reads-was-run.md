---
status: accepted
date: 2026-11-24
decision-makers: Claude
---
# How `fewer-header-reads` was run

## Context and Problem Statement

A speed-up asked for by the owner. Learning mode records how it was run.

## Decision Outcome

- Proposed and pinned first. The spec review was stopped when the owner asked whether the speed-up
  was proven; the work paused until a measurement on the watch (ADR 0014) showed it was.
- Tests first: the read-count tests failed against the old walk (11 and 128 reads).
- Two spec corrections came from the tests: the own entry's part is not 0, and a large directory
  takes 4 reads, not 3 (the last entry fits in the room kept for a TYP).
- One fresh review covered both the spec and conformance, after the code, because the owner had
  half an hour left.

### Consequences

- Bad, because the spec was reviewed after the code, not before. Its findings are in the PR.
