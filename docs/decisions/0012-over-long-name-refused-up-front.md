---
status: proposed
date: 2026-11-10
decision-makers: Claude; the owner decides the kind (change refuse-over-long-names, Q0)
---
# An over-long file name is refused up front, as `name-too-long`

## Context and Problem Statement

A file name longer than an MTP string holds (254 UTF-16 code units) makes `webusb-mtp` 0.1.0's
dataset encoder throw a plain `Error` while `MtpSession.sendObjectInfo` builds its argument, before
any USB transfer. `sendMap` treated every error that wasn't a response as a broken transfer: kind
`broken`, marked as possibly leaving a partial file, and the device closed (ADR 0004). Nothing had
reached the watch, so the caller was told to reconnect and look for a file that couldn't exist.
Which kind should the failure have, and where should it be caught?

## Considered Options

Where:

- Check the name's length in `sendMap` before anything else, against `webusb-mtp`'s exported
  `MAX_STRING_LENGTH`.
- Catch the encoder's error by matching its message.
- Add a typed error to `webusb-mtp` and release it first.
- Keep kind `broken` but leave the device open.

Which kind (open question Q0 in the change's design):

- A new kind, `name-too-long`.
- A broader new kind, such as `bad-name`, for later name rules to share.
- An existing kind: none fits (`response` means the watch answered; `mismatch` that a file was sent).

## Decision Outcome

Chosen options: "check up front" and, pending the owner's answer to Q0, "`name-too-long`".

- **Up front**, because the encoder's plain `Error` can't be told from a transfer that threw
  (WebUSB throws `DOMException`s and plain errors too). Matching its text breaks silently when its
  wording changes. A `webusb-mtp` release is a lot for something this library can check exactly.
  Keeping `broken` with the device open would break ADR 0004's rule that `broken` means closed.
  Checking first also keeps the log honest: no "Announcing" line, no progress.
- **`name-too-long`**, because it says exactly what the caller must fix, and a later rule (an empty
  name, a path separator) can have its own kind.
- The length is counted in UTF-16 code units (JavaScript's `length`), as the encoder and MTP count
  them. The test with 130 map emoji (256 units) shows the difference.

### Consequences

- Good, because a caller keeps the connection, knows no file was left, and can ask for a shorter
  name.
- Good, because no `webusb-mtp` release is needed.
- Bad, because `WatchErrorKind` gains a member: a caller's exhaustive `switch` gets a type error
  until it handles it. the app, the only known caller, bumps the dependency in its own change.
- Bad, because the limit is checked twice (here and in the encoder). Both read the same constant.
