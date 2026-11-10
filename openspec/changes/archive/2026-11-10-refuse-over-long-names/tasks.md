## 1. Tests first

- [x] 1.1 Tests in `test/client.test.ts` for the new scenarios, each citing its requirement: 255 units refused (kind, message, no operation, no progress, no announcement logged, device open); 254 sent and verified; 130 characters of 256 units refused; connection kept (session not broken, free space readable); not marked as a partial file; the refusal's error log line
- [x] 1.2 See them fail against the current `sendMap` (5 failed with kind `broken`, partial file marked; the 254-unit send already passed, as it should)

## 2. Code

- [x] 2.1 `name-too-long` in `WatchErrorKind`; `sendMap` checks the name against `MAX_STRING_LENGTH` before anything else, logs the refusal and throws it
- [x] 2.2 Type check, tests (111) and build pass; README lists the new kind

## 3. Review and records

- [x] 3.1 Spec review, 1 round: no blocker; B1, B2, G1, D1, D2, D3 fixed in the delta, F1 kept (the proposal names it)
- [x] 3.2 Conformance review, 1 round: conforms, no findings
- [x] 3.3 ADR 0012 (checking up front; Q0, proposed until the owner answers), ADR 0013 (how the change was run), the `0.0.0-stage` lesson in `docs/lessons.md`
