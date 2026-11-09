# Lessons

What surprised us or went wrong, and what to do differently. Newest first.

## 2026-11-09 — `/security-review` failed on a clone without `origin/HEAD` (release-to-npm)

The skill reads `git diff origin/HEAD...`, and a branch-only fetch leaves `origin/HEAD` unset, so it
stopped before reviewing anything. `git remote set-head origin main` fixed it. **Do instead:** in a
fresh cloud checkout, run `git remote set-head origin main` once before any review skill that diffs
against the default branch.

## 2026-11-09 — A pipe into `tail` can hide a failed check (carried from webusb-mtp)

`check | tail -1 && git commit …` commits even when the check fails, because the pipeline's exit
status is `tail`'s. **Do instead:** never gate a commit on a piped command. Write the output to a
file and test the check's own exit code, or use `set -o pipefail`.

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
