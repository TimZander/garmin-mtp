// Read a Garmin map's headers only. An .img is a small FAT-like filesystem: a 512-byte header,
// a directory of 512-byte entries, then subfiles stored in blocks. The family ID is in the TYP
// subfile's header (u16 at 0x2F) and in the MPS subfile's map records. Layout confirmed against
// maps built by mkgmap (test/fixtures) and a Garmin map's header.
//
// Everything is read through `readAt` (GetPartialObject on the watch, a slice in tests) within
// a fixed budget, so a multi-gigabyte Garmin map costs at most HEADER_READ_BUDGET bytes. Any
// surprise gives { unknown: reason }, never an exception: a failed check must not stop a send.

export const HEADER_READ_BUDGET = 64 * 1024

export type ReadAt = (offset: number, length: number) => Promise<Uint8Array>

export type FamilyIdResult = { familyId: number; source: 'TYP' | 'MPS' } | { unknown: string }

const ENTRY_SIZE = 0x200

class BudgetSpent extends Error {}

function u16(b: Uint8Array, at: number): number {
  return b[at] | (b[at + 1] << 8)
}

function text(b: Uint8Array, from: number, length: number): string {
  return String.fromCharCode(...b.subarray(from, from + length))
}

export async function readImgFamilyId(readAt: ReadAt, budget = HEADER_READ_BUDGET): Promise<FamilyIdResult> {
  let spent = 0
  const read = async (offset: number, length: number): Promise<Uint8Array> => {
    if (spent + length > budget) throw new BudgetSpent()
    spent += length
    const bytes = await readAt(offset, length)
    if (bytes.length < length) throw new Error(`short read at ${offset} (${bytes.length} of ${length} bytes)`)
    return bytes
  }

  try {
    const header = await read(0, 0x200)
    if (text(header, 0x10, 6) !== 'DSKIMG') return { unknown: 'not a Garmin IMG file (no DSKIMG header)' }
    const exponent = header[0x61] + header[0x62]
    if (exponent < 9 || exponent > 24) return { unknown: `implausible block size 2^${exponent}` }
    const blockSize = 2 ** exponent
    const directoryStart = header[0x40] * 0x200
    if (directoryStart < 0x200) return { unknown: 'implausible directory start' }

    // Walk the directory until its entries stop; remember the first MPS, stop at the first TYP.
    let mpsBlock: number | undefined
    for (let offset = directoryStart; ; offset += ENTRY_SIZE) {
      const entry = await read(offset, ENTRY_SIZE)
      if (entry[0] !== 1) break
      const ext = text(entry, 9, 3)
      const part = u16(entry, 0x10)
      const firstBlock = u16(entry, 0x20)
      if (part !== 0 || firstBlock === 0xffff) continue
      if (ext === 'TYP') {
        const typ = await read(firstBlock * blockSize, 0x40)
        if (text(typ, 2, 10) === 'GARMIN TYP') return { familyId: u16(typ, 0x2f), source: 'TYP' }
      } else if (ext === 'MPS' && mpsBlock === undefined) {
        mpsBlock = firstBlock
      }
    }

    if (mpsBlock !== undefined) {
      const mps = await read(mpsBlock * blockSize, 0x200)
      // Records: type byte, u16 length, body. 'L' (map) and 'F' (family) bodies start with
      // u16 product ID, u16 family ID.
      for (let at = 0; at + 7 <= mps.length; ) {
        const type = mps[at]
        const length = u16(mps, at + 1)
        if (type === 0 || length === 0) break
        if (type === 0x4c || type === 0x46) return { familyId: u16(mps, at + 5), source: 'MPS' }
        at += 3 + length
      }
    }
    return { unknown: 'no TYP or MPS subfile with a family ID' }
  } catch (e) {
    if (e instanceof BudgetSpent) return { unknown: `no family ID within the first ${budget / 1024} KB read` }
    return { unknown: e instanceof Error ? e.message : String(e) }
  }
}

// A map's header info, read in one directory walk within the same budget: the family ID (TYP
// first, then MPS, as readImgFamilyId), the area name of every MPS map record ('L'), whether an
// MPS subfile is named MAKEGMAP (mkgmap's own name), whether any subfile is GMP (Garmin's NT
// format), and whether the whole directory was read. Never throws: anything unreadable leaves the
// directory incomplete.
export interface ImgInfo {
  family: FamilyIdResult
  mapAreas: string[]
  // The IMG header's description (0x49, 20 bytes + 0x65, 31 bytes): the name a watch lists the
  // map under. mkgmap writes --description here; Garmin pads its product names.
  description: string
  mkgmapMps: boolean
  hasGmp: boolean
  directoryComplete: boolean
}

// Whether a map carries a marker the caller names: at least one map record, and every one has
// the marker as its area name.
export function carriesMarker(info: ImgInfo, marker: string): boolean {
  return info.mapAreas.length > 0 && info.mapAreas.every((area) => area === marker)
}

export async function readImgInfo(readAt: ReadAt, budget = HEADER_READ_BUDGET): Promise<ImgInfo> {
  const info: ImgInfo = { family: { unknown: 'not read' }, mapAreas: [], description: '', mkgmapMps: false, hasGmp: false, directoryComplete: false }
  let spent = 0
  const read = async (offset: number, length: number): Promise<Uint8Array> => {
    if (spent + length > budget) throw new BudgetSpent()
    spent += length
    const bytes = await readAt(offset, length)
    if (bytes.length < length) throw new Error(`short read at ${offset} (${bytes.length} of ${length} bytes)`)
    return bytes
  }
  const reason = (e: unknown) =>
    e instanceof BudgetSpent ? `no family ID within the first ${budget / 1024} KB read` : e instanceof Error ? e.message : String(e)

  let blockSize: number
  let typBlock: number | undefined
  let mps: { block: number; size: number } | undefined
  try {
    const header = await read(0, 0x200)
    if (text(header, 0x10, 6) !== 'DSKIMG') {
      info.family = { unknown: 'not a Garmin IMG file (no DSKIMG header)' }
      return info
    }
    // Both parts are padded (mkgmap: spaces); a short name sits whole in the first.
    info.description = (text(header, 0x49, 20) + text(header, 0x65, 31)).replace(/\0/g, '').replace(/ +$/, '')
    const exponent = header[0x61] + header[0x62]
    const directoryStart = header[0x40] * 0x200
    if (exponent < 9 || exponent > 24 || directoryStart < 0x200) {
      info.family = { unknown: 'implausible IMG layout' }
      return info
    }
    blockSize = 2 ** exponent
    for (let offset = directoryStart; ; offset += ENTRY_SIZE) {
      const entry = await read(offset, ENTRY_SIZE)
      if (entry[0] !== 1) break
      const name = text(entry, 1, 8).trim()
      const ext = text(entry, 9, 3)
      if (ext === 'GMP') info.hasGmp = true
      if (u16(entry, 0x10) !== 0 || u16(entry, 0x20) === 0xffff) continue
      if (ext === 'TYP' && typBlock === undefined) {
        // Read the TYP family at once, as readImgFamilyId does, so a directory that outruns the
        // budget later still gives it.
        typBlock = u16(entry, 0x20)
        const typ = await read(typBlock * blockSize, 0x40)
        if (text(typ, 2, 10) === 'GARMIN TYP') info.family = { familyId: u16(typ, 0x2f), source: 'TYP' }
      }
      if (ext === 'MPS') {
        if (name === 'MAKEGMAP') info.mkgmapMps = true
        mps ??= { block: u16(entry, 0x20), size: entry[0x0c] | (entry[0x0d] << 8) | (entry[0x0e] << 16) }
      }
    }
    info.directoryComplete = true
  } catch (e) {
    if (!('familyId' in info.family)) info.family = { unknown: reason(e) }
    return info
  }

  try {
    if (mps) {
      const body = await read(mps.block * blockSize, mps.size)
      for (let at = 0; at + 3 <= body.length; ) {
        const type = body[at]
        const length = u16(body, at + 1)
        if (type === 0 || length === 0) break
        const rec = body.subarray(at + 3, at + 3 + length)
        if (type === 0x4c) {
          // Product, family, map number (8 bytes), then series name, description and area name.
          info.mapAreas.push(text(rec, 8, rec.length - 8).split('\0')[2] ?? '')
          if (!('familyId' in info.family)) info.family = { familyId: u16(rec, 2), source: 'MPS' }
        } else if (type === 0x46 && !('familyId' in info.family)) {
          info.family = { familyId: u16(rec, 2), source: 'MPS' }
        }
        at += 3 + length
      }
    }
  } catch (e) {
    // Map records that can't all be read can't prove the marker. (The body is read whole, so
    // today nothing has been pushed yet; this keeps the rule if the read is ever split.)
    info.mapAreas = []
    if (!('familyId' in info.family)) info.family = { unknown: reason(e) }
  }
  if (!('familyId' in info.family) && info.family.unknown === 'not read') {
    info.family = { unknown: 'no TYP or MPS subfile with a family ID' }
  }
  return info
}
