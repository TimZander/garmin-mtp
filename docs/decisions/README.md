# Decisions

Architecture and process decisions, one per file, as [MADR 4.0](https://adr.github.io/madr/)
records: `NNNN-short-title.md`, numbered in order. Copy [`template.md`](template.md) to start
one. A superseded record stays, with its status set to `superseded by NNNN`.

| No. | Decision | Status |
|---|---|---|
| [0001](0001-webusb-mtp-from-npm.md) | Depend on webusb-mtp from npm | accepted |
| [0002](0002-lift-the-garmin-layer-as-it-is.md) | Lift the app's Garmin layer as it is, in three capabilities | accepted |
| [0003](0003-the-apps-marker-leaves-the-library.md) | The app's build marker leaves the library | accepted |
| [0004](0004-a-broken-failure-closes-the-device.md) | A broken failure after connecting closes the device | accepted |
| [0005](0005-lock-file-started-from-webusb-mtps.md) | The lock file started from webusb-mtp's | accepted |
| [0006](0006-how-lift-garmin-core-was-run.md) | How lift-garmin-core was run | accepted |
| [0007](0007-error-messages-keep-the-apps-wording.md) | Error messages keep the app's wording for now | accepted |
| [0008](0008-package-name-garmin-mtp.md) | The npm package is `garmin-mtp`, unscoped | accepted |
