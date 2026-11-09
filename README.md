# garmin-mtp

Talk to Garmin watches from the browser over [WebUSB](https://wicg.github.io/webusb/): recognise the
watch, find its `GARMIN` folder, send map files there and verify them, delete them, and read a map
file's headers without fetching the whole file. Built on
[webusb-mtp](https://github.com/TimZander/webusb-mtp), which handles the WebUSB and MTP transport.

**Status:** 0.1.0, not published to npm yet.

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
`setup-timeout`, `no-session`, `no-garmin-folder`, `response`, `broken`, `timeout` or `mismatch`.
After connecting, `response` leaves the connection usable; `broken` and `timeout` mean the device
was closed. A failed send says whether it may have left a partial file (`partialFile`).

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

## License

[MIT](LICENSE)
