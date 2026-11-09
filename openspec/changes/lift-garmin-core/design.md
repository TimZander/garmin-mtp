## Context

See proposal.md for why. The code comes from the map app's `knownWatches.ts`, `mtp/client.ts`,
`imgHeader.ts` and the Garmin vendor id in `webusb.ts`. The client already runs on the four MTP
modules that `webusb-mtp` now holds, with the same API (`webusb-mtp` changed comments and three
diagnostic notes, and fixed two bugs). `webusb-mtp` 0.1.0 is on npm.

## Goals / Non-Goals

**Goals:** the Garmin layer and its tests, moved as it is onto `webusb-mtp`; a spec for what it
does; packaging and CI like `webusb-mtp`'s.

**Non-Goals:** publishing to npm; switching the app over; the app's messages, platform hints,
dialogs, file and watch-name rules, and build identity; the probe page; new behaviour.

## Decisions

- **Three capabilities, by what they answer.** `watch-choice` (which device), `garmin-folder` (the
  connection and its file operations), `img-headers` (what a map file is). The header reader needs
  no USB, so it stays apart and works on any read-at function.
- **The code moves unchanged** except: imports go to `webusb-mtp` and relative paths; comments
  lose the app's issue numbers, hardware-round notes and dialog names. Error messages stay word
  for word, so the app's message table keeps working when it switches.
- **The app's marker leaves.** `isBuiltByApp(info)` compares with the app's `maps.timzander.com`.
  It becomes `carriesMarker(info, marker)`, and `mapOrigin(info, file, files, marker?)` returns
  `'marked'` instead of `'app'`, only when a marker is passed. The app passes its own.
- **Two small exports are added:** `GARMIN_VENDOR_ID` and `isGarminDevice`, which the app had as a
  constant in `webusb.ts` and a private helper in `knownWatches.ts`. Garmin mode's product id stays
  private to the client.
- **`webusb-mtp` comes from npm, as `^0.1.0`, with no path alias.** TypeScript and vitest
  resolve it through its published `dist` and declarations, as any user of the library would.
- **The fake USB device is copied from `webusb-mtp`'s tests** (`test/fakeMtpDevice.ts`), since
  `webusb-mtp` doesn't ship its tests. The client tests use a small test log instead of the
  app's probe log.
- **The two IMG fixtures come along** (`family-4242.img`, `marked-4243.img`, built with mkgmap from
  a one-point test map). Their contents are illustrative; the marked one carries the app's marker
  as test data only.
- **Packaging as `webusb-mtp`:** ES module build with declarations to `dist`, `tsc` only, the same
  CI steps. `webusb-mtp` and `@types/w3c-web-usb` are dependencies.

## Provenance

| Library requirement | From the app's requirement |
|---|---|
| watch-choice: Garmin devices are recognised by vendor id | watch-transfer: "The watch is chosen from the button press" (the filter) |
| watch-choice: Garmin mode is recognised | watch-usb-probe: "Garmin mode is recognized" (the check; the hint stays with the app) |
| watch-choice: Known watches start from the allowed devices; follow plugging in and out; One known watch is picked without the chooser; A watch can always be chosen; A watch that failed to open can be forgotten | watch-transfer: "The watch is chosen from the button press", "Another watch can be chosen when sending" (the list's part) |
| garmin-folder: Connecting finds the GARMIN folder | watch-transfer: "Maps are sent to the GARMIN folder", "The connected watch is shown" (the data) |
| garmin-folder: A watch without a GARMIN folder is refused | watch-transfer: "Maps are sent to the GARMIN folder" (scenario "No GARMIN folder") |
| garmin-folder: Connecting reports why it couldn't start | watch-transfer: "Other connection failures are explained", "Steps time out" (the error; the words stay with the app) |
| garmin-folder: A session left open by another app is reopened | watch-usb-probe: "A stale session is reopened" (the client's part) |
| garmin-folder: Failures are errors with a kind | watch-transfer: "Steps time out" (incl. scenario "Watch answers before taking the data"), "Other connection failures are explained" |
| garmin-folder: A file is sent into GARMIN and verified; A failed send says whether a partial file may be left | watch-transfer: "Sending shows progress and is verified", "The watch is always released" (scenario "Transfer breaks") |
| garmin-folder: The library deletes only what it is asked to | watch-transfer: "The app never deletes without confirmation" (the library's part) |
| garmin-folder: Free space can be read again | watch-maps: "The list reflects a delete" (the free space) |
| garmin-folder: The watch is released on close and on failure | watch-transfer: "The watch is always released" |
| garmin-folder: Events are read and logged while connected | watch-transfer: "The watch's events are read" |
| garmin-folder: Operations are logged without serial numbers | watch-usb-probe: "Logs omit device serial numbers"; watch-transfer: "Steps time out" (scenario "Slow answer to a file announcement") |
| garmin-folder: Map files are read through their headers only | watch-transfer: "Family ID clashes are warned about" (scenario "Only headers are read") |
| img-headers: all | watch-transfer: "Family ID clashes are warned about"; watch-maps: "Only maps made with mkgmap can be deleted"; watch-map-label: "A map on the watch is called by its name" (the description); the app's header-reader tests |

Not lifted: the probe page's map inventory (its own logging code), and every requirement about
the app's dialogs, messages, names and builds.

## Risks / Trade-offs

- [A `^0.1.0` range takes `webusb-mtp`'s later 0.1.x releases] → the lock file pins the one
  installed, and a 0.x minor bump needs a deliberate change here.
- [The app keeps its own copy for now] → the two can drift until the app switches over.
- [`webusb-mtp` fixed two bugs the app's copy still has] → this library gets the fixes through
  the dependency; the app gets them when it switches.

## Open Questions

1. **How should `garmin-mtp` depend on `webusb-mtp`?** *Answered by the owner:* npm `^0.1.0`, no
   path alias, now that `webusb-mtp` 0.1.0 is published (ADR 0001).
2. **Renaming the origin `'app'` to `'marked'`, with the marker passed in.** *Assumption:* yes;
   the library knows no app, and the app passes `maps.timzander.com` when it switches.
3. **Error messages keep the app's wording** (for example "so the map wasn't sent" for a missing
   `GARMIN` folder). *Assumption:* keep them word for word for now, so the switch changes nothing
   the user reads; a later change can make them neutral.
4. **Package name on npm.** *Assumption:* `garmin-mtp`, unscoped, matching the repository.
