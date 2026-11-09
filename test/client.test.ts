// Spec: garmin-folder (connecting, sending, verifying, deleting, free space, release, events,
// logging, header reads) and watch-choice › "Garmin mode is recognised", against a simulated
// watch; img-headers › "Maps are classified as made with mkgmap or protected" (mapOrigin).
import { describe, it, expect } from 'vitest'
import {
  closeWatch,
  connectWatch,
  deleteFile,
  mapOrigin,
  readFamilyId,
  readFreeSpace,
  readMapInfo,
  sendMap,
  WatchError,
  type ImgInfo,
  type WatchFile,
} from '../src/index.js'
import { createFakeMtpDevice, mtpConfiguration, type FakeDeviceOptions, type FakeObject } from './fakeMtpDevice.js'
import { FAMILY_4242, FIXTURE_MARKER, MARKED_4243 } from './imgFixture.js'
import { TestLog } from './testLog.js'

const S1 = 0x00010001
const S2 = 0x00020001
const ROOT = 0xffffffff
const GARMIN = 0x091e

const watchObjects: FakeObject[] = [
  { handle: 1, storageId: S1, parent: ROOT, name: 'Music', folder: true },
  { handle: 2, storageId: S1, parent: ROOT, name: 'GARMIN', folder: true },
  { handle: 3, storageId: S1, parent: 2, name: 'trail.img', size: 339_968 },
  { handle: 4, storageId: S1, parent: 2, name: 'Courses', folder: true },
  { handle: 5, storageId: S1, parent: 2, name: 'device.fit', size: 3_562 },
]

function setup(options: FakeDeviceOptions = {}) {
  const fake = createFakeMtpDevice({ vendorId: GARMIN, productId: 0x4f42, objects: watchObjects, ...options })
  const log = new TestLog()
  return { fake, log, text: () => log.text() }
}

async function connected(options: FakeDeviceOptions = {}) {
  const s = setup(options)
  const conn = await connectWatch(s.fake.device, s.log, {})
  return { ...s, conn }
}

const fail = (p: Promise<unknown>) => p.then(() => expect.fail('expected a failure'), (e: unknown) => e as WatchError)

describe('connectWatch', () => {
  it('reports the model, free space and the GARMIN folder listing', async () => {
    const { conn, text } = await connected({
      model: 'Watch 3',
      storages: [{ id: S1, description: 'Internal Storage', maxCapacity: 31e9, freeSpace: 6_676_971_520 }],
    })
    expect(conn.model).toBe('Watch 3')
    expect(conn.freeBytes).toBe(6_676_971_520)
    expect(conn.storageId).toBe(S1)
    expect(conn.garmin).toEqual({ handle: 2, name: 'GARMIN' })
    expect(conn.files.map((f) => f.name)).toEqual(['trail.img', 'Courses', 'device.fit'])
    expect(conn.imgFiles).toEqual([expect.objectContaining({ handle: 3, name: 'trail.img', size: 339_968 })])
    expect(text()).toMatch(/Model: Watch 3/)
    expect(text()).toMatch(/GARMIN folder on storage 0x10001: 3 objects; 6,676,971,520 bytes free/)
  })

  it('uses the first storage whose root has a GARMIN folder, any case', async () => {
    const { conn } = await connected({
      storages: [
        { id: S1, description: 'Card', maxCapacity: 1e9, freeSpace: 1e8 },
        { id: S2, description: 'Internal', maxCapacity: 2e9, freeSpace: 5e8 },
      ],
      objects: [
        { handle: 1, storageId: S1, parent: ROOT, name: 'DCIM', folder: true },
        { handle: 2, storageId: S2, parent: ROOT, name: 'Garmin', folder: true },
      ],
    })
    expect(conn.storageId).toBe(S2)
    expect(conn.freeBytes).toBe(5e8)
    expect(conn.garmin.name).toBe('Garmin')
  })

  it('still connects when GetDeviceInfo is refused, with the model "Garmin watch"', async () => {
    const { conn } = await connected({ failWith: (op) => (op === 0x1001 ? 0x2005 : undefined) })
    expect(conn.model).toBe('Garmin watch')
    expect(conn.garmin.handle).toBe(2)
  })

  it('uses the model "Garmin watch" when GetDeviceInfo reports none', async () => {
    const { conn } = await connected({ model: '' })
    expect(conn.model).toBe('Garmin watch')
  })

  it('fails with no-garmin-folder, creating nothing, and releases the watch', async () => {
    const { fake } = setup({ objects: [{ handle: 1, storageId: S1, parent: ROOT, name: 'Music', folder: true }] })
    const err = await fail(connectWatch(fake.device, new TestLog(), {}))
    expect(err).toBeInstanceOf(WatchError)
    expect(err.kind).toBe('no-garmin-folder')
    expect(fake.sentOperations).not.toContain(0x100c)
    expect(fake.sentOperations.slice(-1)[0]).toBe(0x1003)
    expect(fake.opened).toBe(false)
  })

  it('recognises Garmin mode without opening, claiming or sending anything', async () => {
    const { fake } = setup({ productId: 0x0003 })
    const err = await fail(connectWatch(fake.device, new TestLog(), {}))
    expect(err.kind).toBe('garmin-mode')
    expect(fake.setupCalls).toEqual([])
    expect(fake.sentOperations).toEqual([])
  })

  it('fails with no-interface, opening nothing, when there is no MTP interface', async () => {
    const { fake } = setup({
      configurations: [
        {
          configurationValue: 1,
          interfaces: [
            {
              interfaceNumber: 0,
              alternates: [{ interfaceClass: 0x08, endpoints: [{ endpointNumber: 1, direction: 'in', type: 'bulk' }, { endpointNumber: 2, direction: 'out', type: 'bulk' }] }],
            },
          ],
        },
      ],
    })
    const err = await fail(connectWatch(fake.device, new TestLog(), {}))
    expect(err.kind).toBe('no-interface')
    expect(fake.setupCalls).toEqual([])
  })

  it('reports a claim failure with its step and closes the device', async () => {
    const { fake } = setup({ setupError: { claimInterface: new DOMException('Unable to claim interface.', 'NetworkError') } })
    const err = await fail(connectWatch(fake.device, new TestLog(), {}))
    expect(err.kind).toBe('setup')
    expect(err.step).toBe('claimInterface')
    expect(err.message).toMatch(/Unable to claim interface/)
    expect(fake.opened).toBe(false)
  })

  it('reports a claim that never completes as a setup timeout', async () => {
    const { fake } = setup({ setupHang: { claimInterface: true } })
    const err = await fail(connectWatch(fake.device, new TestLog(), { timeoutMs: 20 }))
    expect(err.kind).toBe('setup-timeout')
    expect(err.step).toBe('claimInterface')
    expect(fake.opened).toBe(false)
  })

  it('reopens a session another app left open', async () => {
    const { fake, conn, text } = await connected({ initialSessionOpen: true })
    expect(conn.garmin.handle).toBe(2)
    expect(fake.sentOperations.slice(0, 4)).toEqual([0x1001, 0x1002, 0x1003, 0x1002])
    expect(text()).toMatch(/reopen/i)
  })

  it('reopens even when CloseSession of the stale session is refused', async () => {
    let opens = 0
    const { conn } = await connected({
      failWith: (op) => {
        if (op === 0x1002) return opens++ === 0 ? 0x201e : undefined
        if (op === 0x1003) return 0x2002
        return undefined
      },
    })
    expect(conn.garmin.handle).toBe(2)
  })

  it('fails with no-session when the reopen is refused too', async () => {
    const { fake } = setup({ failWith: (op) => (op === 0x1002 ? 0x201e : undefined) })
    const err = await fail(connectWatch(fake.device, new TestLog(), {}))
    expect(err.kind).toBe('no-session')
    expect(fake.opened).toBe(false)
  })

  it('fails with no-session when OpenSession is refused outright', async () => {
    const { fake } = setup({ failWith: (op) => (op === 0x1002 ? 0x2005 : undefined) })
    const err = await fail(connectWatch(fake.device, new TestLog(), {}))
    expect(err.kind).toBe('no-session')
    expect(fake.sentOperations.filter((op) => op === 0x1002)).toHaveLength(1)
  })

  it('reports an operation that times out after the caller\'s timeout, and closes the device', async () => {
    const { fake } = setup({ hangOn: (op) => op === 0x1004 })
    const started = Date.now()
    const err = await fail(connectWatch(fake.device, new TestLog(), { timeoutMs: 20 }))
    expect(Date.now() - started).toBeLessThan(2_000)
    expect(err.kind).toBe('timeout')
    expect(err.message).toMatch(/GetStorageIDs/)
    expect(err.details.operation).toBe(0x1004)
    expect(fake.opened).toBe(false)
  })

  it('reports a refusal while connecting with its codes, and closes the device', async () => {
    const { fake } = setup({ failWith: (op) => (op === 0x1004 ? 0x2002 : undefined) })
    const err = await fail(connectWatch(fake.device, new TestLog(), {}))
    expect(err.kind).toBe('response')
    expect(err.details).toMatchObject({ operation: 0x1004, responseCode: 0x2002 })
    expect(fake.opened).toBe(false)
  })

  it('hands both serial numbers to the log before any later line', async () => {
    const { log, text } = await connected({ usbSerial: 'USB11111', mtpSerial: 'MTP22222' })
    expect(log.events[0]).toBe('redact USB11111')
    const mtp = log.events.indexOf('redact MTP22222')
    expect(mtp).toBeGreaterThan(-1)
    // Handed over right after GetDeviceInfo's own line, before any later line.
    expect(log.events[mtp - 1]).toMatch(/^line GetDeviceInfo/)
    expect(text()).not.toMatch(/USB11111|MTP22222/)
  })

  it('works with a vendor-specific interface', async () => {
    const { conn } = await connected({ configurations: [mtpConfiguration(512, 0xff)] })
    expect(conn.garmin.handle).toBe(2)
  })
})

describe('sendMap', () => {
  const map = (n: number) => new Uint8Array(n).map((_, i) => (i * 7) % 256)

  it('writes the file into GARMIN under the given name and dates, with progress to 1, and verifies it', async () => {
    const { fake, conn } = await connected()
    const progress: number[] = []
    const result = await sendMap(conn, 'trail.img', map(150_000), (f) => progress.push(f), new Date(2026, 9, 25, 17, 30, 5))
    const created = fake.objects.find((o) => o.handle === result.handle)!
    expect(created).toMatchObject({ name: 'trail.img', parent: 2, storageId: S1 })
    expect(created.data).toEqual(map(150_000))
    expect(fake.objectInfos.slice(-1)[0]).toMatchObject({ dateCreated: '20261025T173005', dateModified: '20261025T173005' })
    expect(progress[0]).toBeGreaterThanOrEqual(0)
    expect(progress.slice(-1)[0]).toBe(1)
    expect(result).toMatchObject({ name: 'trail.img', size: 150_000 })
  })

  it('never deletes, even beside a file of the same name', async () => {
    const { fake, conn } = await connected()
    await sendMap(conn, 'trail.img', map(10), () => {})
    expect(fake.sentOperations).not.toContain(0x100b)
  })

  it("logs a send's diagnostics", async () => {
    const { conn, text } = await connected()
    await sendMap(conn, 'a.img', map(10), () => {})
    expect(text()).toMatch(/Announcing a\.img/)
    expect(text()).toMatch(/File information sent with SendObjectInfo \(\d+ bytes\):\n0000 {2}[0-9A-F]{2}( [0-9A-F]{2})*/)
    expect(text()).toMatch(/accepted all 10 bytes/)
    expect(text()).toMatch(/Read back: a\.img, 10 bytes/)
  })

  it('reports a read-back size that does not match, as a possible partial file', async () => {
    const { conn } = await connected({ reportedSizeDelta: -1 })
    const err = await fail(sendMap(conn, 'new.img', map(1000), () => {}))
    expect(err).toBeInstanceOf(WatchError)
    expect(err.kind).toBe('mismatch')
    expect(err.message).toMatch(/1,000 bytes.*999 bytes/)
    expect(err.partialFile).toBe(true)
  })

  it('reports a refused SendObjectInfo without a partial file, and keeps the session usable', async () => {
    const { conn } = await connected({ failWith: (op) => (op === 0x100c ? 0x200c : undefined) })
    const err = await fail(sendMap(conn, 'new.img', map(10), () => {}))
    expect(err.kind).toBe('response')
    expect(err.details).toMatchObject({ operation: 0x100c, responseCode: 0x200c })
    expect(err.partialFile).toBe(false)
    expect(conn.session.broken).toBe(false)
  })

  it('reports an answer before the data as a response, and closes the device', async () => {
    const { fake, conn } = await connected({ answerBeforeData: (op) => (op === 0x100c ? 0x2002 : undefined) })
    const err = await fail(sendMap(conn, 'new.img', map(10), () => {}))
    expect(err.kind).toBe('response')
    expect(err.details.responseCode).toBe(0x2002)
    expect(fake.opened).toBe(false)
  })

  it('reports a broken transfer after SendObjectInfo as a possible partial file', async () => {
    const { fake, conn } = await connected({ throwOn: (op) => op === 0x100d })
    const err = await fail(sendMap(conn, 'new.img', map(10), () => {}))
    expect(err.kind).toBe('broken')
    expect(err.partialFile).toBe(true)
    expect(fake.opened).toBe(false)
  })

  it('reports a stalled send as a timeout with a possible partial file', async () => {
    const s = setup({ stallDataAfterBytes: 70_000 })
    const conn = await connectWatch(s.fake.device, s.log, { timeoutMs: 30 })
    const err = await fail(sendMap(conn, 'big.img', map(200_000), () => {}))
    expect(err.kind).toBe('timeout')
    expect(err.partialFile).toBe(true)
    expect(s.fake.opened).toBe(false)
  })

  it('logs how long the watch took to answer the announcement and the data', async () => {
    const s = setup({ answerDelayMs: (op) => (op === 0x100c ? 40 : 0) })
    const conn = await connectWatch(s.fake.device, s.log, { timeoutMs: 20, writeTimeoutMs: 500 })
    await sendMap(conn, 'slow.img', new Uint8Array(10), () => {})
    expect(s.text()).toMatch(/SendObjectInfo \(0x100C\) → OK \(0x2001\) after \d+\.\d s/)
    expect(s.text()).toMatch(/SendObject \(0x100D\) → OK \(0x2001\) after \d+\.\d s/)
  })

  it('treats an announcement with no answer as a possible partial file, logging the status and cancel first', async () => {
    const s = setup({ hangOn: (op) => op === 0x100c })
    const conn = await connectWatch(s.fake.device, s.log, { timeoutMs: 20, writeTimeoutMs: 40 })
    const err = await fail(sendMap(conn, 'x.img', new Uint8Array(10), () => {}))
    expect(err.kind).toBe('timeout')
    expect(err.partialFile).toBe(true)
    expect(s.text()).toMatch(/MTP status/)
    expect(s.text()).toMatch(/cancel/i)
  })
})

describe('deleteFile, readFreeSpace and closeWatch', () => {
  it('deletes exactly the given object', async () => {
    const { fake, conn } = await connected()
    await deleteFile(conn, 3)
    expect(fake.sentOperations.filter((op) => op === 0x100b)).toHaveLength(1)
    expect(fake.objects.map((o) => o.handle)).toEqual([1, 2, 4, 5])
  })

  it('reports a refused delete with its codes, and keeps the session usable', async () => {
    const { conn } = await connected({ failWith: (op) => (op === 0x100b ? 0x200d : undefined) })
    const err = await fail(deleteFile(conn, 3))
    expect(err.kind).toBe('response')
    expect(err.details).toMatchObject({ operation: 0x100b, responseCode: 0x200d })
    expect(conn.session.broken).toBe(false)
  })

  it('reads the free space again and keeps it on the connection', async () => {
    const storages = [{ id: S1, description: 'Internal', maxCapacity: 1e9, freeSpace: 1_000_000 }]
    const { conn } = await connected({ storages })
    storages[0].freeSpace = 4_000_000
    expect(await readFreeSpace(conn)).toBe(4_000_000)
    expect(conn.freeBytes).toBe(4_000_000)
  })

  it('closes the device when an answer after connecting cannot be decoded (broken)', async () => {
    let corrupt = false
    const { fake, conn } = await connected({ corruptData: (op) => corrupt && op === 0x1005 })
    corrupt = true
    const err = await fail(readFreeSpace(conn))
    expect(err.kind).toBe('broken')
    expect(fake.opened).toBe(false)
    const count = fake.sentOperations.length
    await closeWatch(conn)
    expect(fake.sentOperations.length).toBe(count)
  })

  it("closes the device when a send's read-back cannot be decoded (broken)", async () => {
    let corrupt = false
    const { fake, conn } = await connected({ corruptData: (op) => corrupt && op === 0x1008 })
    corrupt = true
    const err = await fail(sendMap(conn, 'new.img', new Uint8Array(10), () => {}))
    expect(err.kind).toBe('broken')
    expect(err.partialFile).toBe(true)
    expect(fake.opened).toBe(false)
  })

  it('closes the session and releases the device, leaving no event read pending', async () => {
    const { fake, conn } = await connected()
    await closeWatch(conn)
    await new Promise((r) => setTimeout(r, 0))
    expect(fake.sentOperations.slice(-1)[0]).toBe(0x1003)
    expect(fake.opened).toBe(false)
    expect(fake.pendingEventReads).toBe(0)
  })

  it('does not send CloseSession after a broken transfer', async () => {
    const { fake, conn } = await connected({ throwOn: (op) => op === 0x100d })
    await sendMap(conn, 'new.img', new Uint8Array(10), () => {}).catch(() => {})
    const count = fake.sentOperations.length
    await closeWatch(conn)
    expect(fake.sentOperations.length).toBe(count)
  })

  it('leaves no event read pending when connecting fails', async () => {
    const { fake } = setup({ objects: [] })
    await connectWatch(fake.device, new TestLog(), {}).catch(() => {})
    await new Promise((r) => setTimeout(r, 0))
    expect(fake.opened).toBe(false)
    expect(fake.pendingEventReads).toBe(0)
  })
})

describe('watch events', () => {
  it('completes a send on a watch that withholds its answer until its event is read', async () => {
    const s = setup({ objectAddedEvent: 'blocking' })
    const conn = await connectWatch(s.fake.device, s.log, { timeoutMs: 50, writeTimeoutMs: 200 })
    const sent = await sendMap(conn, 'evented.img', new Uint8Array(10), () => {})
    expect(sent.name).toBe('evented.img')
    expect(s.text()).toMatch(new RegExp(`Event: ObjectAdded \\(0x4002\\), params 0x${sent.handle.toString(16).toUpperCase().padStart(8, '0')}`))
  })
})

describe('readFamilyId and readMapInfo', () => {
  it("reads a map file's family ID on the watch with GetPartialObject only", async () => {
    const { fake, conn } = await connected({
      objects: [...watchObjects, { handle: 9, storageId: S1, parent: 2, name: 'fixture.img', data: FAMILY_4242 }],
    })
    const file = conn.imgFiles.find((f) => f.name === 'fixture.img')!
    const before = fake.sentOperations.length
    expect(await readFamilyId(conn, file)).toEqual({ familyId: 4242, source: 'TYP' })
    const ops = fake.sentOperations.slice(before)
    expect(ops.length).toBeGreaterThan(0)
    expect(ops.every((op) => op === 0x101b)).toBe(true)
  })

  it("reads a map's header info on the watch with GetPartialObject only", async () => {
    const { fake, conn } = await connected({
      objects: [...watchObjects, { handle: 6, storageId: S1, parent: 2, name: 'marked.img', data: MARKED_4243 }],
    })
    const file = conn.imgFiles.find((f) => f.name === 'marked.img')!
    const before = fake.sentOperations.length
    const info = await readMapInfo(conn, file)
    expect(info.family).toEqual({ familyId: 4243, source: 'TYP' })
    expect(fake.sentOperations.slice(before).every((op) => op === 0x101b)).toBe(true)
    expect(mapOrigin(info, file, conn.files, FIXTURE_MARKER)).toBe('marked')
  })

  it('reports a refused header read as unknown with a reason, without throwing', async () => {
    const { fake, conn } = await connected({ failWith: (op) => (op === 0x101b ? 0x2002 : undefined) })
    expect(await readFamilyId(conn, conn.imgFiles[0])).toEqual({ unknown: expect.stringMatching(/GetPartialObject/) })
    expect((await readMapInfo(conn, conn.imgFiles[0])).family).toEqual({ unknown: expect.stringMatching(/GetPartialObject/) })
    expect(fake.opened).toBe(true)
  })

  it('reports a header read that times out as unknown, and the device is closed', async () => {
    const s = setup({ hangOn: (op) => op === 0x101b })
    const conn = await connectWatch(s.fake.device, s.log, { timeoutMs: 20 })
    expect(await readFamilyId(conn, conn.imgFiles[0])).toEqual({ unknown: expect.stringMatching(/GetPartialObject/) })
    expect(s.fake.opened).toBe(false)
  })
})

describe('mapOrigin', () => {
  const file = (name: string, isFolder = false): WatchFile => ({ handle: 9, name, size: 1, modified: '', isFolder })
  const info = (o: Partial<ImgInfo> = {}): ImgInfo => ({
    family: { familyId: 9167, source: 'TYP' },
    mapAreas: ['Area 91670001'],
    description: 'Fixture',
    mkgmapMps: true,
    hasGmp: false,
    directoryComplete: true,
    ...o,
  })
  const map = file('trail.img')

  it('a map made with mkgmap', () => {
    expect(mapOrigin(info(), map, [map])).toBe('mkgmap')
  })

  it('a marked map is marked when asked with its marker, and made with mkgmap without one', () => {
    const marked = info({ mapAreas: ['example.test'] })
    expect(mapOrigin(marked, map, [map], 'example.test')).toBe('marked')
    expect(mapOrigin(marked, map, [map])).toBe('mkgmap')
    expect(mapOrigin(marked, map, [map], 'other.test')).toBe('mkgmap')
  })

  it('a GMP subfile, another MPS name or an incomplete directory make it protected, marker or not', () => {
    for (const o of [{ hasGmp: true }, { mkgmapMps: false }, { directoryComplete: false }]) {
      expect(mapOrigin(info(o), map, [map])).toBe('protected')
      expect(mapOrigin(info({ ...o, mapAreas: ['example.test'] }), map, [map], 'example.test')).toBe('protected')
    }
  })

  it('a same-name .gma file (any case) makes it protected; a folder of that name does not', () => {
    const d = file('D1234567A.img')
    expect(mapOrigin(info(), d, [d, file('d1234567a.GMA')])).toBe('protected')
    expect(mapOrigin(info(), d, [d, file('D1234567A.gma', true)])).toBe('mkgmap')
  })
})
