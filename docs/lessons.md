# Lessons

What surprised us or went wrong, and what to do differently. Newest first.

## 2026-11-10 — `npm view <pkg>@latest` showed `0.0.0-stage` for minutes after a publish (0.1.1)

Right after the 0.1.1 release published, `npm view garmin-mtp@latest version` answered
`0.0.0-stage` for several minutes before it showed `0.1.1`. The publish had worked; the registry's
answer was stale. **Do instead:** after a release, poll
`npm view <pkg>@latest version --prefer-online` until it shows the new version, in the background
for a wait of more than two minutes, before deciding a publish failed or bumping a dependent.

## 2026-11-09 — A trusted publisher allowed to stage refused a direct publish (0.1.1)

The first release without a token failed with `403 … OIDC permission denied for this action`,
although the trusted publisher's repository, workflow and environment all matched. Its permission
was "npm stage publish", and the workflow publishes directly. **Do instead:** when setting up a
trusted publisher, check its permission matches how the workflow publishes. Re-running only the
failed publish job afterwards reuses the check job's build. A new trusted publisher must publish
once within about two days to be validated.

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
