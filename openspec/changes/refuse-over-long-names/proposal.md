## Why

A file name longer than an MTP string can hold (254 UTF-16 code units) makes `webusb-mtp`'s
dataset encoder throw a plain `Error` while `sendMap` builds the SendObjectInfo dataset, before any
operation is sent. `sendMap` treats every error that isn't a response as a broken transfer, so the
caller gets kind `broken`, marked as possibly leaving a partial file, and the device is closed. In
fact nothing reached the watch and the session is fine: the caller is told to reconnect and to
look for a partial file that can't exist. The spec doesn't cover a send that fails before anything
is sent.

## What Changes

- `sendMap` checks the name's length before anything else and refuses one longer than 254 UTF-16
  code units with a new kind, `name-too-long`: nothing is sent or announced, the error is marked as
  leaving no file, and the connection stays usable.
- `name-too-long` joins the list of error kinds.
- A lesson in `docs/lessons.md` the previous release taught (`npm view <pkg>@latest` shows
  `0.0.0-stage` for minutes after a publish), carried with this PR because it is the next one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `garmin-folder`: a new requirement for an over-long name, and `name-too-long` in the kinds.

## Impact

- `src/client.ts` (`sendMap`, `WatchErrorKind`) and `test/client.test.ts`.
- The public type `WatchErrorKind` gains a member: a caller with an exhaustive `switch` over it
  gets a type error until it handles `name-too-long`. The only known caller is garmin-map, which
  bumps the dependency in its own change.
- Released afterwards as 0.1.2 through the existing release workflow; not part of this change.
