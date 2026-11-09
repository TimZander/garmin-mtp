# Lessons

What surprised us or went wrong, and what to do differently. Newest first.

## 2026-11-09 — A failure test whose input never failed (lift-garmin-core)

The test for "reading a file's header fails" read a zero-filled file: every read succeeded, and the
result was unknown only because the file wasn't an IMG. It still passed with the reader made to
throw. The conformance review's mutation probe found it. **Do instead:** drive the failure the
scenario names (here a refused and a hung GetPartialObject) and check the test fails when the
handling is broken.

## 2026-11-09 — Tests written against the wrong log format (lift-garmin-core)

Two new client tests failed on first run because of the tests, not the code: `formatCode` prints
`0x10001`, not `0x00010001`, and setup lines come before GetDeviceInfo's. **Do instead:** run a
new test against the real log once and read the lines before writing the assertion.
