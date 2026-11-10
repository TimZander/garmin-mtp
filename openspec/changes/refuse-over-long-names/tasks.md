## 1. Tests first

- [ ] 1.1 Tests in `test/client.test.ts` for the new scenarios, each citing its requirement: 255 units refused (kind, message, no operation, no progress, no announcement logged, device open); 254 sent and verified; 130 characters of 256 units refused; connection kept (session not broken, free space readable); not marked as a partial file; the refusal's error log line
- [ ] 1.2 See them fail against the current `sendMap`

## 2. Code

- [ ] 2.1 `name-too-long` in `WatchErrorKind`; `sendMap` checks the name against `MAX_STRING_LENGTH` before anything else, logs the refusal and throws it
- [ ] 2.2 Type check, tests and build pass

## 3. Review and records

- [x] 3.1 Spec review, 1 round: no blocker; B1, B2, G1, D1, D2, D3 fixed in the delta, F1 kept (the proposal names it)
- [ ] 3.2 Conformance review
- [ ] 3.3 ADR for Q0 and for checking up front; how the change was run; the `0.0.0-stage` lesson in `docs/lessons.md`
