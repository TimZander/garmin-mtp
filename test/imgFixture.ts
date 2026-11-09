// Test IMG files: the two maps built with mkgmap (see test/fixtures) and a builder for small
// synthetic IMG files with the subfiles a test needs.
import { readFileSync } from 'node:fs'

export const fixture = (name: string) => new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)))

// family-4242.img: a one-point map built with family id 4242, description "Fixture Map".
// marked-4243.img: the same map with family id 4243, description "Marked Map", and its one map
// record's area name set to a marker.
export const FAMILY_4242 = fixture('family-4242.img')
export const MARKED_4243 = fixture('marked-4243.img')
export const FIXTURE_MARKER = 'maps.timzander.com'

export const DIR = 0x400
export const ENTRY = 0x200

export function entryOf(bytes: Uint8Array, ext: string): number {
  for (let off = DIR; off < DIR + 32 * ENTRY; off += ENTRY) {
    if (String.fromCharCode(...bytes.subarray(off + 9, off + 12)) === ext) return off
  }
  throw new Error(`no ${ext} entry`)
}

export interface Subfile {
  name: string
  ext: string
  body: Uint8Array
}

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0))

// A TYP subfile header saying `GARMIN TYP` (or another type), with a family id at 0x2F.
export function typ(familyId: number, type = 'GARMIN TYP'): Uint8Array {
  const b = new Uint8Array(0x40)
  b.set(ascii(type), 2)
  b[0x2f] = familyId & 0xff
  b[0x30] = familyId >> 8
  return b
}

// An MPS map record ('L'): product, family, map number, then series, description, area name.
export function mapRecord(familyId: number, area: string): Uint8Array {
  const strings = ascii(`Series\0Description\0${area}\0`)
  const body = new Uint8Array(8 + strings.length)
  body[0] = 1
  body[2] = familyId & 0xff
  body[3] = familyId >> 8
  body.set(strings, 8)
  return new Uint8Array([0x4c, body.length & 0xff, body.length >> 8, ...body])
}

// An IMG with 512-byte blocks, its directory at 0x400 and each subfile in its own blocks after it.
export function buildImg(subfiles: Subfile[], description = 'Synthetic'): Uint8Array {
  const dirBlocks = subfiles.length + 1
  const blocks = subfiles.map((s) => Math.max(1, Math.ceil(s.body.length / 0x200)))
  const total = DIR + dirBlocks * ENTRY + blocks.reduce((a, b) => a + b, 0) * 0x200
  const img = new Uint8Array(total)
  img.set(ascii('DSKIMG'), 0x10)
  img[0x40] = DIR / 0x200
  img[0x61] = 9
  img[0x62] = 0
  img.set(ascii(description.padEnd(20, ' ').slice(0, 20)), 0x49)
  img.set(ascii(description.slice(20).padEnd(31, ' ')), 0x65)
  let block = (DIR + dirBlocks * ENTRY) / 0x200
  subfiles.forEach((s, i) => {
    const e = DIR + i * ENTRY
    img[e] = 1
    img.set(ascii(s.name.padEnd(8, ' ')), e + 1)
    img.set(ascii(s.ext), e + 9)
    img[e + 0x0c] = s.body.length & 0xff
    img[e + 0x0d] = (s.body.length >> 8) & 0xff
    img[e + 0x0e] = s.body.length >> 16
    img[e + 0x20] = block & 0xff
    img[e + 0x21] = block >> 8
    img.set(s.body, block * 0x200)
    block += blocks[i]
  })
  return img
}

// A readAt over bytes that records how much was read.
export function reader(bytes: Uint8Array) {
  let total = 0
  const readAt = async (offset: number, length: number) => {
    total += length
    return bytes.slice(offset, offset + length)
  }
  return { readAt, read: () => total }
}
