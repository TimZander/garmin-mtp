---
status: accepted
date: 2026-11-09
decision-makers: Claude
---
# A broken failure after connecting closes the device

## Context and Problem Statement

The spec says `broken` and `timeout` mean the device was closed. The conformance review found that
an answer that won't decode (thrown after `webusb-mtp`'s transaction, so its session isn't marked
broken) gave kind `broken` with the device still open, in `sendMap`'s read-back, `deleteFile` and
`readFreeSpace`. The app's copy has the same gap.

## Considered Options

- Close the device, and mark the session broken, whenever a failure after connecting is `broken`
  or `timeout`.
- Give such failures a kind of their own and leave the device open.
- Fix it in `webusb-mtp`, so the session marks itself broken on a decode error.

## Decision Outcome

Chosen option: "Close the device here", because it makes the code match the reviewed spec with no
new kind and no `webusb-mtp` release. A decode error in `webusb-mtp` itself can be a follow-up
there.

### Consequences

- Good, because a caller can rely on the kind alone to know the watch's state.
- Bad, because the library departs from the app's copy until the app switches.
