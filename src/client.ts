// The watch client: connect to a Garmin watch over WebUSB/MTP, find its GARMIN folder, send a
// file there and verify it, delete a file, read the free space again, close. Connecting checks
// for Garmin mode, chooses the MTP interface, sets up with timeouts and reopens a session another
// app left open.
//
// Failures are WatchErrors with a `kind`; callers turn them into messages and platform hints.
// The client never deletes on its own: deleteFile removes only the object the caller names.

import {
  MtpResponseError,
  MtpSession,
  MtpTimeoutError,
  MtpTransport,
  ObjectFormat,
  OperationCode,
  ResponseCode,
  UsbSetupError,
  describeError,
  eventName,
  findMtpInterface,
  formatCode,
  operationName,
  type ObjectInfo,
  type SetupStep,
} from 'webusb-mtp'
import { GARMIN_VENDOR_ID } from './garmin.js'
import { carriesMarker, readImgFamilyId, readImgInfo, type FamilyIdResult, type ImgInfo } from './imgHeader.js'

// Garmin mode: Garmin's own USB protocol, not MTP (the ID Linux's garmin_gps driver matches).
const GARMIN_MODE_PRODUCT_ID = 0x0003

// What the client writes its progress to. The log removes every serial it is handed with
// redact() from what it shows.
export interface WatchLog {
  info(text: string): void
  ok(text: string): void
  error(text: string): void
  redact(secret: string | undefined): void
  // Raw lines such as hex dumps; info() is used when absent.
  data?(text: string): void
}

function hexLines(bytes: Uint8Array): string[] {
  const lines: string[] = []
  for (let i = 0; i < bytes.length; i += 16) {
    const row = Array.from(bytes.subarray(i, i + 16))
    lines.push(`${i.toString(16).toUpperCase().padStart(4, '0')}  ${row.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}`)
  }
  return lines
}

export type WatchErrorKind =
  | 'garmin-mode' // product 0x0003: Garmin's protocol, not MTP
  | 'no-interface' // no MTP interface in the descriptor
  | 'setup' // open / configuration / claim / alternate setting threw
  | 'setup-timeout' // one of those never completed
  | 'no-session' // OpenSession refused, even after closing a stale one
  | 'no-garmin-folder' // no storage root has a GARMIN folder
  | 'response' // the watch answered an operation with a non-OK code
  | 'broken' // a transfer threw; the device was closed
  | 'timeout' // an operation got no answer (or a send stalled); the device was closed
  | 'mismatch' // the file read back doesn't match what was sent

export class WatchError extends Error {
  constructor(
    readonly kind: WatchErrorKind,
    message: string,
    readonly details: { step?: SetupStep; operation?: number; responseCode?: number; partialFile?: boolean } = {},
  ) {
    super(message)
    this.name = 'WatchError'
  }

  get step(): SetupStep | undefined {
    return this.details.step
  }

  get partialFile(): boolean {
    return this.details.partialFile ?? false
  }
}

export interface WatchFile {
  handle: number
  name: string
  size: number
  modified: string
  isFolder: boolean
}

export interface WatchConnection {
  session: MtpSession
  transport: MtpTransport
  log: WatchLog
  model: string
  storageId: number
  freeBytes: number
  garmin: { handle: number; name: string }
  // Everything directly in GARMIN, folders included (a name clash is with any object).
  files: WatchFile[]
  imgFiles: WatchFile[]
}

export interface ConnectOptions {
  timeoutMs?: number
  writeTimeoutMs?: number
}

// MTP dates: YYYYMMDDThhmmss, local time.
export function mtpDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

const count = (n: number) => n.toLocaleString('en-US')

// Map an error thrown by a session operation to a WatchError. A non-OK answer leaves the pipe
// usable; anything else means the session already closed the device.
function toWatchError(e: unknown, code: number, partialFile = false): WatchError {
  if (e instanceof WatchError) return e
  if (e instanceof MtpResponseError) {
    return new WatchError('response', e.message, { operation: code, responseCode: e.responseCode, partialFile })
  }
  if (e instanceof MtpTimeoutError) return new WatchError('timeout', e.message, { operation: code, partialFile })
  return new WatchError('broken', `${operationName(code)} (${formatCode(code)}) failed: ${describeError(e)}`, {
    operation: code,
    partialFile,
  })
}

// After connecting: turn a failure into a WatchError and throw it. `broken` and `timeout` mean
// the device is closed; an error that didn't come from the transfer itself (an answer that won't
// decode) leaves the session open, so the device is closed here.
async function fail(conn: WatchConnection, e: unknown, code: number, partialFile = false): Promise<never> {
  const err = toWatchError(e, code, partialFile)
  if (err.kind === 'broken' || err.kind === 'timeout') {
    conn.session.broken = true
    conn.session.isOpen = false
    await conn.transport.close()
  }
  throw err
}

function toFile(handle: number, info: ObjectInfo): WatchFile {
  return {
    handle,
    name: info.filename,
    size: info.objectCompressedSize,
    modified: info.dateModified,
    isFolder: info.isFolder,
  }
}

export async function connectWatch(device: USBDevice, log: WatchLog, options: ConnectOptions): Promise<WatchConnection> {
  log.redact(device.serialNumber ?? undefined)
  if (device.vendorId === GARMIN_VENDOR_ID && device.productId === GARMIN_MODE_PRODUCT_ID) {
    log.error("The watch is connected in Garmin mode (product 0x0003), which isn't MTP.")
    throw new WatchError('garmin-mode', "The watch is connected in Garmin mode, which isn't MTP.")
  }
  const choice = findMtpInterface(device)
  if (!choice) {
    log.error('No MTP interface found.')
    throw new WatchError('no-interface', "The watch doesn't offer an MTP interface.")
  }

  const transport = new MtpTransport(device, choice, undefined, options.timeoutMs)
  try {
    await transport.setup((message) => log.ok(message))
  } catch (e) {
    await transport.close()
    if (e instanceof UsbSetupError) {
      log.error(e.message)
      throw new WatchError(e.timedOut ? 'setup-timeout' : 'setup', e.message, { step: e.step })
    }
    throw e
  }

  // Read the watch's events for the whole connection (it may wait for them to be read).
  transport.startEvents((ev) => {
    const params = ev.params.map((p) => `0x${p.toString(16).toUpperCase().padStart(8, '0')}`).join(', ')
    log.info(`Event: ${eventName(ev.code)} (${formatCode(ev.code)})${params ? `, params ${params}` : ''}`)
  })

  const session = new MtpSession(transport, {
    timeoutMs: options.timeoutMs,
    writeTimeoutMs: options.writeTimeoutMs,
    onOperation: (op) => {
      // Writes also log how long the watch took to answer (a watch may take well over 10 s to
      // answer SendObjectInfo).
      const isWrite = op.code === formatCode(OperationCode.SendObjectInfo) || op.code === formatCode(OperationCode.SendObject)
      const took = isWrite ? ` after ${(op.elapsedMs / 1000).toFixed(1)} s` : ''
      const line = `${op.name} (${op.code}) → ${op.responseName} (${op.responseCode})${took}`
      if (op.responseName === 'OK') log.ok(line)
      else log.error(line)
    },
    onNote: (text) => log.info(text),
    onDataOut: (code, payload) => {
      if (code !== OperationCode.SendObjectInfo) return
      log.info(`File information sent with SendObjectInfo (${payload.length} bytes):`)
      hexLines(payload).forEach((l) => (log.data ? log.data(l) : log.info(l)))
    },
    onDataWritten: (code, payload) => {
      if (code === OperationCode.SendObjectInfo) log.info(`The watch accepted the file information (${payload.length} bytes)`)
      if (code === OperationCode.SendObject) log.info(`The watch accepted all ${count(payload.length)} bytes of the file`)
    },
  })
  const release = async () => {
    if (session.isOpen && !session.broken) await session.closeSession().catch(() => {})
    await transport.close()
  }

  // Run one operation; turn any failure into a WatchError after releasing the watch.
  async function op<T>(code: number, run: () => Promise<T>): Promise<T> {
    try {
      return await run()
    } catch (e) {
      await release()
      throw toWatchError(e, code)
    }
  }

  let model = 'Garmin watch'
  try {
    const info = await session.getDeviceInfo()
    log.redact(info.serialNumber)
    model = info.model || model
    log.info(`Model: ${model}`)
  } catch (e) {
    // Not needed to send: carry on unless the pipe broke.
    if (!(e instanceof MtpResponseError)) {
      await release()
      throw toWatchError(e, OperationCode.GetDeviceInfo)
    }
  }

  await op(OperationCode.OpenSession, async () => {
    try {
      await session.openSession()
    } catch (e) {
      if (!(e instanceof MtpResponseError && e.responseCode === ResponseCode.SessionAlreadyOpen)) throw e
      log.info('A session was already open (left by another app); closing it and reopening.')
      await session.closeSession().catch((err) => {
        if (!(err instanceof MtpResponseError)) throw err
      })
      await session.openSession()
      log.ok('Reopened the session')
    }
  }).catch((e: WatchError) => {
    throw e.kind === 'response' ? new WatchError('no-session', `Couldn't open a session with the watch: ${e.message}`) : e
  })

  const storageIds = await op(OperationCode.GetStorageIDs, () => session.getStorageIds())
  for (const storageId of storageIds) {
    const rootHandles = await op(OperationCode.GetObjectHandles, () => session.getObjectHandles(storageId))
    for (const handle of rootHandles) {
      const info = await op(OperationCode.GetObjectInfo, () => session.getObjectInfo(handle))
      if (!info.isFolder || info.filename.toUpperCase() !== 'GARMIN') continue
      const storage = await op(OperationCode.GetStorageInfo, () => session.getStorageInfo(storageId))
      const files: WatchFile[] = []
      for (const h of await op(OperationCode.GetObjectHandles, () => session.getObjectHandles(storageId, handle))) {
        files.push(toFile(h, await op(OperationCode.GetObjectInfo, () => session.getObjectInfo(h))))
      }
      log.info(
        `GARMIN folder on storage ${formatCode(storageId)}: ${files.length} objects; ${count(storage.freeSpaceInBytes)} bytes free`,
      )
      return {
        session,
        transport,
        log,
        model,
        storageId,
        freeBytes: storage.freeSpaceInBytes,
        garmin: { handle, name: info.filename },
        files,
        imgFiles: files.filter((f) => !f.isFolder && /\.img$/i.test(f.name)),
      }
    }
  }
  log.error('No storage on the watch has a GARMIN folder.')
  await release()
  throw new WatchError('no-garmin-folder', "The watch has no GARMIN folder, so the map wasn't sent.")
}

export interface SentFile {
  handle: number
  name: string
  size: number
}

// Send `bytes` as `fileName` into the GARMIN folder, then read it back and check its name and
// size. onProgress gets 0..1. Never deletes: a same-name file is the caller's to remove first.
export async function sendMap(
  conn: WatchConnection,
  fileName: string,
  bytes: Uint8Array,
  onProgress: (fraction: number) => void,
  now: Date = new Date(),
): Promise<SentFile> {
  const { session, log } = conn
  let handle: number
  log.info(`Announcing ${fileName} to the watch (SendObjectInfo) and waiting for its answer`)
  try {
    ;({ handle } = await session.sendObjectInfo(conn.storageId, conn.garmin.handle, {
      storageId: conn.storageId,
      objectFormat: ObjectFormat.Undefined,
      objectCompressedSize: bytes.length,
      parentObject: conn.garmin.handle,
      associationType: 0,
      filename: fileName,
      dateCreated: mtpDate(now),
      dateModified: mtpDate(now),
    }))
  } catch (e) {
    // A refused announcement leaves nothing; one that timed out or broke leaves the watch's
    // state unknown, so an empty file may exist.
    return fail(conn, e, OperationCode.SendObjectInfo, !(e instanceof MtpResponseError))
  }
  // From here on, a failure may leave a partial file in GARMIN.
  try {
    await session.sendObject(bytes, (sent, total) => onProgress(sent / total))
  } catch (e) {
    return fail(conn, e, OperationCode.SendObject, true)
  }
  let info: ObjectInfo
  try {
    info = await session.getObjectInfo(handle)
  } catch (e) {
    return fail(conn, e, OperationCode.GetObjectInfo, true)
  }
  log.info(`Read back: ${info.filename}, ${count(info.objectCompressedSize)} bytes`)
  if (info.filename !== fileName || info.objectCompressedSize !== bytes.length) {
    throw new WatchError(
      'mismatch',
      `The file on the watch doesn't match what was sent: sent ${fileName}, ${count(bytes.length)} bytes; ` +
        `the watch reports ${info.filename}, ${count(info.objectCompressedSize)} bytes.`,
      { partialFile: true },
    )
  }
  return { handle, name: info.filename, size: info.objectCompressedSize }
}

// Delete exactly the object the caller names. Whether it may be deleted is the caller's decision
// (mapOrigin classifies maps).
export async function deleteFile(conn: WatchConnection, handle: number): Promise<void> {
  try {
    await conn.session.deleteObject(handle)
  } catch (e) {
    return fail(conn, e, OperationCode.DeleteObject)
  }
}

// Close the session (unless the connection broke) and release the device. Never throws.
export async function closeWatch(conn: WatchConnection): Promise<void> {
  if (conn.session.isOpen && !conn.session.broken) await conn.session.closeSession().catch(() => {})
  await conn.transport.close()
}

// The family ID of a map file on the watch, from its headers only (GetPartialObject, at most
// imgHeader's 64 KB budget). Never throws: anything unreadable is { unknown }.
export function readFamilyId(conn: WatchConnection, file: WatchFile): Promise<FamilyIdResult> {
  return readImgFamilyId((offset, length) => conn.session.getPartialObject(file.handle, offset, length))
}

// A map file's header info on the watch (GetPartialObject, within imgHeader's 64 KB budget).
// Never throws.
export function readMapInfo(conn: WatchConnection, file: WatchFile): Promise<ImgInfo> {
  return readImgInfo((offset, length) => conn.session.getPartialObject(file.handle, offset, length))
}

// Where a map came from, which decides whether it may be deleted. Made with mkgmap: the whole
// directory was read, an MPS subfile is named MAKEGMAP, there is no GMP subfile, and GARMIN holds
// no .gma file (any case, not a folder) with the map's base name. Marked: that, plus every map
// record carrying the marker the caller names. Everything else is protected.
export type MapOrigin = 'marked' | 'mkgmap' | 'protected'

export function mapOrigin(info: ImgInfo, file: WatchFile, files: WatchFile[], marker?: string): MapOrigin {
  const base = file.name.replace(/\.img$/i, '').toLowerCase()
  const gma = files.some((f) => !f.isFolder && f.name.toLowerCase() === `${base}.gma`)
  if (!info.directoryComplete || !info.mkgmapMps || info.hasGmp || gma) return 'protected'
  return marker !== undefined && carriesMarker(info, marker) ? 'marked' : 'mkgmap'
}

// The free space of the storage holding GARMIN, read again (after a delete). Updates the connection.
export async function readFreeSpace(conn: WatchConnection): Promise<number> {
  try {
    const storage = await conn.session.getStorageInfo(conn.storageId)
    conn.freeBytes = storage.freeSpaceInBytes
    return conn.freeBytes
  } catch (e) {
    return fail(conn, e, OperationCode.GetStorageInfo)
  }
}

