## Context

See proposal.md. In `webusb-mtp` 0.1.0, `MtpSession.sendObjectInfo` calls
`encodeObjectInfo(info)` as an argument to its transaction, so the encoder's
`An MTP string holds at most 254 UTF-16 units` error is thrown before any USB transfer: no
operation is sent and the session's state is unchanged. `webusb-mtp` exports the limit as
`MAX_STRING_LENGTH` (254). The dates `sendMap` sends are fixed-length, so the name is the only
string that can be too long.

## Goals / Non-Goals

**Goals:** an over-long name fails with a kind that says so, leaves no file and keeps the
connection usable; the device isn't closed for it.

**Non-Goals:** other name rules (empty names, path separators, characters a watch may refuse);
shortening or rewriting a name for the caller; changing `webusb-mtp`.

## Decisions

- **Check the length up front, in `sendMap`, rather than catch the encoder's error.** The encoder
  throws a plain `Error`, which `sendMap` can't tell from a transfer that threw (WebUSB throws
  `DOMException`s and plain errors too), so catching it would mean matching its message text. An
  explicit check against `webusb-mtp`'s exported `MAX_STRING_LENGTH` is exact, needs no change to
  `webusb-mtp`, and runs before the "Announcing" log line, so the log doesn't say a file was
  announced when it wasn't.
  - Rejected: match the encoder's message (breaks silently when its wording changes); add a typed
    error to `webusb-mtp` first (a release there for something this library can check itself);
    keep kind `broken` but leave the device open (breaks the rule that `broken` means the device
    was closed, ADR 0004).
- **Count UTF-16 code units, as JavaScript's `length` does**, because that is what an MTP string
  holds and what the encoder counts; a name of 130 characters can exceed the limit when they lie
  outside the Basic Multilingual Plane.
- **The refusal is logged** with `log.error`, giving the length and the limit, as the error's
  message does (spec review round 1, G1 and D3: the log line was in the design but in no
  requirement).
- **No progress is reported for a refused name** (`onProgress` is never called), so a caller's
  progress bar doesn't start for a send that never began (spec review round 1, D2).

## Open Questions

- **Q0. Which kind does an over-long name get?** Options: a new kind `name-too-long`; a broader
  new kind such as `bad-name` that later name rules could share; an existing kind (none fits:
  `response` means the watch answered, `mismatch` means a file was sent). *Assumption:* a new kind
  `name-too-long`, because it says exactly what the caller must fix, and a later rule can get its
  own kind.

## Risks / Trade-offs

- A new member of `WatchErrorKind` is a type error for a caller with an exhaustive `switch`; 0.x
  versions allow it in a patch, and the app is the only known caller.
