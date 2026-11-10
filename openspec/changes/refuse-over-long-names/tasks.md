## 1. Tests first

- [ ] 1.1 Tests in `test/client.test.ts` for the scenarios of "A name longer than MTP allows is refused before sending" (255 units refused, 254 sent, 130 characters of 256 units refused), each citing the requirement
- [ ] 1.2 See them fail against the current `sendMap`

## 2. Code

- [ ] 2.1 `name-too-long` in `WatchErrorKind`; `sendMap` checks the name against `MAX_STRING_LENGTH` before anything else, logs the refusal and throws it
- [ ] 2.2 Type check, tests and build pass

## 3. Review and records

- [ ] 3.1 Spec review
- [ ] 3.2 Conformance review
- [ ] 3.3 ADR for Q0 and for checking up front; how the change was run; the `0.0.0-stage` lesson in `docs/lessons.md`
