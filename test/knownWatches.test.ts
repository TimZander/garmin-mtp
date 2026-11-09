// Spec: watch-choice (Garmin devices, known watches, picking and choosing).
import { describe, it, expect, vi } from 'vitest'
import { GARMIN_VENDOR_ID, createKnownWatches, isGarminDevice, type UsbLike } from '../src/index.js'

const dev = (vendorId: number, name = 'w') => ({ vendorId, productId: 0x4f42, productName: name }) as unknown as USBDevice

function fakeUsb(initial: USBDevice[] | Error, picked?: USBDevice) {
  const listeners: Record<string, ((e: { device: USBDevice }) => void)[]> = {}
  const usb: UsbLike = {
    getDevices: vi.fn(async () => {
      if (initial instanceof Error) throw initial
      return initial
    }),
    requestDevice: vi.fn(async () => {
      if (!picked) throw new DOMException('No device selected.', 'NotFoundError')
      return picked
    }),
    addEventListener: (type: string, fn: (e: { device: USBDevice }) => void) => {
      ;(listeners[type] ??= []).push(fn)
    },
  }
  const fire = (type: 'connect' | 'disconnect', device: USBDevice) => listeners[type]?.forEach((fn) => fn({ device }))
  return { usb, fire }
}

describe('Garmin devices', () => {
  it('are recognised by vendor id 0x091E, which is offered to callers', () => {
    expect(GARMIN_VENDOR_ID).toBe(0x091e)
    expect(isGarminDevice(dev(0x091e))).toBe(true)
    expect(isGarminDevice(dev(0x1234))).toBe(false)
  })
})

describe('knownWatches', () => {
  it('starts from the allowed devices, Garmin only', async () => {
    const a = dev(0x091e), other = dev(0x1234)
    const { usb } = fakeUsb([a, other])
    const w = createKnownWatches(usb)
    await w.ready
    expect(w.list()).toEqual([a])
  })

  it('is ready and empty when the allowed devices cannot be read', async () => {
    const { usb } = fakeUsb(new Error('SecurityError'))
    const w = createKnownWatches(usb)
    await expect(w.ready).resolves.toBeUndefined()
    expect(w.list()).toEqual([])
  })

  it('one known watch: pick uses it without the chooser', async () => {
    const a = dev(0x091e)
    const { usb } = fakeUsb([a])
    const w = createKnownWatches(usb)
    await w.ready
    await expect(w.pick()).resolves.toBe(a)
    expect(usb.requestDevice).not.toHaveBeenCalled()
  })

  it('none or two: pick opens the chooser at once with the Garmin filter only', async () => {
    for (const initial of [[], [dev(0x091e, 'a'), dev(0x091e, 'b')]]) {
      const picked = dev(0x091e, 'p')
      const { usb } = fakeUsb(initial, picked)
      const w = createKnownWatches(usb)
      await w.ready
      const p = w.pick()
      // Called synchronously, inside the click
      expect(usb.requestDevice).toHaveBeenCalledWith({ filters: [{ vendorId: 0x091e }] })
      await expect(p).resolves.toBe(picked)
    }
  })

  it('choose always opens the chooser, and a watch picked there joins the list', async () => {
    const a = dev(0x091e, 'a')
    const picked = dev(0x091e, 'p')
    const { usb } = fakeUsb([a], picked)
    const w = createKnownWatches(usb)
    await w.ready
    await expect(w.choose()).resolves.toBe(picked)
    expect(usb.requestDevice).toHaveBeenCalledWith({ filters: [{ vendorId: 0x091e }] })
    expect(w.list()).toEqual([a, picked])
  })

  it('a watch picked in the chooser is then picked without it', async () => {
    const picked = dev(0x091e)
    const { usb } = fakeUsb([], picked)
    const w = createKnownWatches(usb)
    await w.ready
    await w.choose()
    expect(w.list()).toEqual([picked])
    await w.pick()
    expect(usb.requestDevice).toHaveBeenCalledTimes(1)
  })

  it('connect adds once, disconnect removes, other vendors are ignored', async () => {
    const a = dev(0x091e)
    const { usb, fire } = fakeUsb([])
    const w = createKnownWatches(usb)
    await w.ready
    fire('connect', a)
    fire('connect', a)
    fire('connect', dev(0x1234))
    expect(w.list()).toEqual([a])
    fire('disconnect', a)
    expect(w.list()).toEqual([])
  })

  it('a forgotten watch (it failed to open) makes the next pick ask', async () => {
    const a = dev(0x091e)
    const { usb } = fakeUsb([a], a)
    const w = createKnownWatches(usb)
    await w.ready
    w.forget(a)
    await w.pick()
    expect(usb.requestDevice).toHaveBeenCalledTimes(1)
  })

  it('a closed chooser rejects and adds nothing', async () => {
    const { usb } = fakeUsb([])
    const w = createKnownWatches(usb)
    await w.ready
    await expect(w.choose()).rejects.toThrow()
    expect(w.list()).toEqual([])
  })
})
