# garmin-mtp

Talk to Garmin watches from the browser over [WebUSB](https://wicg.github.io/webusb/): recognise the
watch, find its `GARMIN` folder, send map files there and verify them, delete them, and read a map
file's headers without fetching the whole file. Built on
[webusb-mtp](https://github.com/TimZander/webusb-mtp), which handles the WebUSB and MTP transport.

## Install

```sh
npm install garmin-mtp
```

It brings `webusb-mtp` with it.

## Browser support

The same as `webusb-mtp`'s: Chromium-based browsers in a secure context (HTTPS or `localhost`), and
an operating system that lets the browser claim the watch's MTP interface. Use `webUsbAvailable()`
from `webusb-mtp` to check first.

## Usage

```ts
import { closeWatch, connectWatch, createKnownWatches, mapOrigin, readMapInfo, sendMap, WatchError } from 'garmin-mtp'

const watches = createKnownWatches(navigator.usb)
await watches.ready

// In a click handler: the one known watch, or the browser's chooser filtered to Garmin.
const device = await watches.pick()

const log = { info: console.debug, ok: console.debug, error: console.warn, redact: () => {} }
try {
  const conn = await connectWatch(device, log, {})
  console.log(conn.model, conn.freeBytes, conn.imgFiles.map((f) => f.name))

  // Header reads only: at most 64 KiB per file.
  for (const file of conn.imgFiles) {
    const info = await readMapInfo(conn, file)
    console.log(file.name, info.description, mapOrigin(info, file, conn.files))
  }

  const bytes = new Uint8Array(await (await fetch('/my-map.img')).arrayBuffer())
  await sendMap(conn, 'my-map.img', bytes, (fraction) => console.log(Math.round(fraction * 100), '%'))
  await closeWatch(conn)
} catch (e) {
  if (e instanceof WatchError) console.error(e.kind, e.message, e.partialFile ? '(a partial file may be left)' : '')
  else throw e
}
```

Every failure is a `WatchError` with a `kind`: `garmin-mode`, `no-interface`, `setup`,
`setup-timeout`, `no-session`, `no-garmin-folder`, `response`, `broken`, `timeout`, `mismatch` or
`name-too-long`. After connecting, `response` leaves the connection usable; `broken` and `timeout`
mean the device was closed. A name longer than MTP allows (254 UTF-16 units) is refused as
`name-too-long` before anything is sent, and the connection stays usable. A failed send says whether it may have left a partial file (`partialFile`).

`mapOrigin` says whether a map was made with mkgmap (and so may be deleted) or is protected. Pass a
marker to tell your own maps apart: a map whose every map record has that area name is `marked`.

## Scope

Garmin-specific helpers only: the Garmin vendor id and Garmin mode, the list of known watches, the
`GARMIN` folder client, and the IMG header reader. The MTP layer is `webusb-mtp`'s. Messages for
users, platform hints and file-naming rules belong to the app that uses it.

## Development

```sh
npm ci
npm run typecheck
npm test
npm run build   # ES modules and type declarations in dist/
```

Tests run in Node against a scripted fake USB device (`test/fakeMtpDevice.ts`, copied from
`webusb-mtp`) and two small maps built with mkgmap (`test/fixtures`). The behaviour is specified in
`openspec/specs/`, and changes go through spec-driven development (see `CLAUDE.md`).

## Releasing

1. Bump `version` in `package.json` (and `package-lock.json`) in a pull request, and merge it.
2. In the Actions tab, run the **release** workflow (`.github/workflows/release.yml`) on `main`.
   It installs, type-checks, tests and builds, then waits for the owner to approve the publish
   in the `npm` environment, then publishes that version to npm with provenance. It publishes only
   from `main`, and a version npm already has fails the run.

The `npm` environment (Settings → Environments) has the owner as required reviewer and allows
`main` only; it must exist before the first release.

The first publish authenticates with a short-lived npm token in the `NPM_TOKEN` repository secret.
After it, add this workflow as the package's trusted publisher on npmjs.com (GitHub Actions,
repository `TimZander/garmin-mtp`, workflow `release.yml`, environment `npm`), then delete the token
and the secret: later releases use trusted publishing, with no stored credential.

The workflow is the same as `webusb-mtp`'s; a change to one belongs in the other.

## License

[MIT](LICENSE)
