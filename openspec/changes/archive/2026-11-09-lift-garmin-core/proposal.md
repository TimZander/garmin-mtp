## Why

A web app that builds Garmin maps sends them to a watch over WebUSB. Its generic MTP stack now
lives in `webusb-mtp`. What is left in the app is Garmin-specific: recognising a Garmin watch,
finding its `GARMIN` folder, sending, verifying and deleting map files there, and reading a map
file's headers without fetching the whole file. Lifting that layer into `garmin-mtp`, on top of
`webusb-mtp`, lets other Garmin projects use it and lets the app switch to both libraries later.

## What Changes

- Add the library's code, lifted as it is from the app and moved onto `webusb-mtp`'s API:
  - the Garmin USB facts (vendor id `0x091E`, "Garmin mode" product `0x0003`);
  - the list of known watches the browser already allows, with the chooser filtered to Garmin;
  - the watch client: connect, find `GARMIN`, send a file and verify it, delete a file, read the
    free space again, close; failures as errors with a kind;
  - the IMG header reader: family id, description, map records' area names, mkgmap and GMP
    markers, all within a 64 KiB read budget; and the map origin rule (protected or made with
    mkgmap).
- Two small exports, `GARMIN_VENDOR_ID` and `isGarminDevice`, and one API change: the app's own
  build marker leaves the library. Whether a map is "made with
  this app" becomes "every map record carries a marker the caller names".
- Add their tests, with the app's two IMG fixtures and a copy of `webusb-mtp`'s fake USB device.
- Package it like `webusb-mtp` (ES module build with declarations, not published) and add CI.
- A README: what it is, usage, scope.

## Capabilities

### New Capabilities

- `watch-choice`: recognising Garmin devices, Garmin mode, and the list of known watches that
  decides when the browser's chooser is needed.
- `garmin-folder`: a connection to a watch's `GARMIN` folder, and sending, verifying, deleting
  and re-reading free space there, with errors that say what state the watch was left in.
- `img-headers`: reading a Garmin map file's headers within a budget, and deciding from them
  whether a map may be deleted.

### Modified Capabilities

None (the repository has no specs yet).

## Impact

- New code under `src/`, tests and fixtures under `test/`, packaging, CI and README.
- New dependency: `webusb-mtp` from npm, `^0.1.0`.
- Out of scope: the app's dialogs, messages and platform hints, its file and watch-name rules,
  its build identity (family ids, `--description`, its marker's value), the probe page, and
  switching the app over.
