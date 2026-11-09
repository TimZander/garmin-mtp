// Spec: img-headers (reading within a budget, never throwing, family id, description, how the
// map was made, the marker). The fixtures are real maps built with mkgmap.
import { describe, it, expect } from 'vitest'
import { HEADER_READ_BUDGET, carriesMarker, readImgFamilyId, readImgInfo, type ImgInfo } from '../src/index.js'
import {
  DIR,
  ENTRY,
  FAMILY_4242 as fixture,
  FIXTURE_MARKER,
  MARKED_4243 as marked,
  buildImg,
  entryOf,
  mapRecord,
  reader,
  typ,
} from './imgFixture.js'

const renamed = (bytes: Uint8Array, ext: string, to = 'XXX') => {
  const out = bytes.slice()
  out.set([...to].map((c) => c.charCodeAt(0)), entryOf(out, ext) + 9)
  return out
}

// A directory of 200 RGN entries (no TYP, no MPS) after the fixture's header.
function hugeDirectory(): Uint8Array {
  const huge = new Uint8Array(DIR + 200 * ENTRY)
  huge.set(fixture.subarray(0, DIR))
  const rgn = entryOf(fixture, 'RGN')
  for (let i = 0; i < 200; i++) huge.set(fixture.subarray(rgn, rgn + ENTRY), DIR + i * ENTRY)
  return huge
}

describe('readImgFamilyId', () => {
  it("reads the family ID from a real mkgmap map's TYP subfile", async () => {
    expect(await readImgFamilyId(reader(fixture).readAt)).toEqual({ familyId: 4242, source: 'TYP' })
  })

  it('falls back to the MPS subfile when there is no TYP', async () => {
    expect(await readImgFamilyId(reader(renamed(fixture, 'TYP')).readAt)).toEqual({ familyId: 4242, source: 'MPS' })
  })

  it('tries each TYP in turn: a first TYP that is not a Garmin TYP is skipped', async () => {
    const img = buildImg([
      { name: 'FIRST', ext: 'TYP', body: typ(5, 'OTHER TYPE') },
      { name: 'SECOND', ext: 'TYP', body: typ(7) },
      { name: 'MAKEGMAP', ext: 'MPS', body: mapRecord(9, 'Area') },
    ])
    expect(await readImgFamilyId(reader(img).readAt)).toEqual({ familyId: 7, source: 'TYP' })
  })

  it("reports a file that isn't an IMG", async () => {
    const result = await readImgFamilyId(reader(new Uint8Array(4096)).readAt)
    expect(result).toEqual({ unknown: expect.stringMatching(/not a Garmin IMG/) })
  })

  it('reports a truncated file', async () => {
    expect(await readImgFamilyId(reader(fixture.slice(0, 0x300)).readAt)).toHaveProperty('unknown')
  })

  it('reports a corrupted directory start', async () => {
    const bad = fixture.slice()
    bad[0x40] = 0
    expect(await readImgFamilyId(reader(bad).readAt)).toEqual({ unknown: expect.stringMatching(/implausible/) })
  })

  it('reports an impossible block size', async () => {
    const bad = fixture.slice()
    bad[0x61] = 30
    bad[0x62] = 0
    expect(await readImgFamilyId(reader(bad).readAt)).toEqual({ unknown: expect.stringMatching(/implausible block size/) })
  })

  it('never reads more than 64 KB, even from a huge directory without TYP or MPS', async () => {
    const r = reader(hugeDirectory())
    expect(await readImgFamilyId(r.readAt)).toEqual({ unknown: expect.stringMatching(/64 KB/) })
    expect(r.read()).toBeLessThanOrEqual(HEADER_READ_BUDGET)
    expect(HEADER_READ_BUDGET).toBe(64 * 1024)
  })

  it('reports a read that throws', async () => {
    const result = await readImgFamilyId(async () => {
      throw new Error('device gone')
    })
    expect(result).toEqual({ unknown: 'device gone' })
  })
})

describe('readImgInfo', () => {
  // The marked map with a second map record (the unmarked fixture's) added to its MPS.
  function merged(): Uint8Array {
    const out = marked.slice()
    const mpsEntry = entryOf(out, 'MPS')
    const size = out[mpsEntry + 0x0c] | (out[mpsEntry + 0x0d] << 8)
    const start = (out[mpsEntry + 0x20] | (out[mpsEntry + 0x21] << 8)) * 0x200
    const otherEntry = entryOf(fixture, 'MPS')
    const otherStart = (fixture[otherEntry + 0x20] | (fixture[otherEntry + 0x21] << 8)) * 0x200
    const otherL = fixture.slice(otherStart, otherStart + 3 + (fixture[otherStart + 1] | (fixture[otherStart + 2] << 8)))
    const body = new Uint8Array([...out.subarray(start, start + size), ...otherL])
    out.set(body, start) // still within the MPS's 512-byte block
    out[mpsEntry + 0x0c] = body.length & 0xff
    out[mpsEntry + 0x0d] = body.length >> 8
    return out
  }

  it('an mkgmap map: its area name, MAKEGMAP MPS, no GMP, directory complete', async () => {
    const info = await readImgInfo(reader(fixture).readAt)
    expect(info.family).toEqual({ familyId: 4242, source: 'TYP' })
    expect(info.mapAreas).toEqual(['Area 42420002'])
    expect(info).toMatchObject({ mkgmapMps: true, hasGmp: false, directoryComplete: true })
  })

  it('a marked map carries its marker', async () => {
    const info = await readImgInfo(reader(marked).readAt)
    expect(info.family).toEqual({ familyId: 4243, source: 'TYP' })
    expect(info.mapAreas).toEqual([FIXTURE_MARKER])
    expect(carriesMarker(info, FIXTURE_MARKER)).toBe(true)
    expect(carriesMarker(info, 'example.test')).toBe(false)
  })

  it('keeps a TYP family found before the budget runs out in the directory', async () => {
    let budget = 0x200
    while ('unknown' in (await readImgFamilyId(reader(marked).readAt, budget))) budget += 0x40
    expect(budget).toBeLessThan(marked.length)
    const info = await readImgInfo(reader(marked).readAt, budget)
    expect(info.family).toEqual({ familyId: 4243, source: 'TYP' })
    expect(info.directoryComplete).toBe(false)
  })

  it('reads only the first TYP: a first TYP that is not a Garmin TYP gives the MPS family id', async () => {
    const img = buildImg([
      { name: 'FIRST', ext: 'TYP', body: typ(5, 'OTHER TYPE') },
      { name: 'SECOND', ext: 'TYP', body: typ(7) },
      { name: 'MAKEGMAP', ext: 'MPS', body: mapRecord(9, 'Area') },
    ])
    expect((await readImgInfo(reader(img).readAt)).family).toEqual({ familyId: 9, source: 'MPS' })
  })

  it('reads the header description even when the directory outruns the budget', async () => {
    expect((await readImgInfo(reader(marked).readAt, 0x200)).description).toBe('Marked Map')
  })

  it('reads the header description', async () => {
    expect((await readImgInfo(reader(marked).readAt)).description).toBe('Marked Map')
    expect((await readImgInfo(reader(fixture).readAt)).description).toBe('Fixture Map')
  })

  it('a map merging a marked and an unmarked record does not carry the marker', async () => {
    const info = await readImgInfo(reader(merged()).readAt)
    expect(info.mapAreas).toEqual([FIXTURE_MARKER, 'Area 42420002'])
    expect(carriesMarker(info, FIXTURE_MARKER)).toBe(false)
  })

  it('no MPS: no area names, not MAKEGMAP', async () => {
    const info = await readImgInfo(reader(renamed(marked, 'MPS')).readAt)
    expect(info.mapAreas).toEqual([])
    expect(info.mkgmapMps).toBe(false)
  })

  it('notices a GMP subfile', async () => {
    expect((await readImgInfo(reader(renamed(fixture, 'RGN', 'GMP')).readAt)).hasGmp).toBe(true)
  })

  it("a file that isn't an IMG: family unknown, empty description, directory incomplete", async () => {
    const info = await readImgInfo(reader(new Uint8Array(4096)).readAt)
    expect(info.family).toEqual({ unknown: expect.stringMatching(/not a Garmin IMG/) })
    expect(info.description).toBe('')
    expect(info.directoryComplete).toBe(false)
  })

  it('an impossible block size: family unknown, saying the layout is implausible', async () => {
    const bad = marked.slice()
    bad[0x61] = 30
    bad[0x62] = 0
    expect((await readImgInfo(reader(bad).readAt)).family).toEqual({ unknown: expect.stringMatching(/implausible/) })
  })

  it('a truncated file: family unknown, directory incomplete', async () => {
    const info = await readImgInfo(reader(marked.slice(0, 0x300)).readAt)
    expect(info.family).toHaveProperty('unknown')
    expect(info.directoryComplete).toBe(false)
    expect(carriesMarker(info, FIXTURE_MARKER)).toBe(false)
  })

  it('a read that throws: family unknown with its reason', async () => {
    const info = await readImgInfo(async () => {
      throw new Error('device gone')
    })
    expect(info.family).toEqual({ unknown: 'device gone' })
  })

  it('map records that cannot all be read leave the area names empty', async () => {
    const short = marked.slice()
    const mpsEntry = entryOf(short, 'MPS')
    short[mpsEntry + 0x0e] = 0x10 // an MPS of over 1 MB, past the budget
    const info = await readImgInfo(reader(short).readAt)
    expect(info.directoryComplete).toBe(true)
    expect(info.mapAreas).toEqual([])
  })

  it('never reads more than 64 KB, and a directory that needs more is incomplete', async () => {
    const r = reader(hugeDirectory())
    const info = await readImgInfo(r.readAt)
    expect(r.read()).toBeLessThanOrEqual(HEADER_READ_BUDGET)
    expect(info.family).toEqual({ unknown: expect.stringMatching(/64 KB/) })
    expect(info.directoryComplete).toBe(false)
  })
})

describe('carriesMarker', () => {
  const info = (mapAreas: string[]): ImgInfo => ({
    family: { familyId: 1, source: 'TYP' },
    mapAreas,
    description: '',
    mkgmapMps: true,
    hasGmp: false,
    directoryComplete: true,
  })

  it('is true only when every map record carries the marker', () => {
    expect(carriesMarker(info(['example.test']), 'example.test')).toBe(true)
    expect(carriesMarker(info(['example.test', 'Area 42420002']), 'example.test')).toBe(false)
  })

  it('is false for a map with no map records', () => {
    expect(carriesMarker(info([]), 'example.test')).toBe(false)
    expect(carriesMarker(info([]), '')).toBe(false)
  })
})
