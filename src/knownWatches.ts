// The Garmin watches the browser already lets this page use and that are plugged in. A caller
// decides from this list synchronously, inside the user's click: with exactly one watch the
// chooser is skipped; otherwise requestDevice() still runs within user activation. WebUSB fires
// `connect` on plug-in but not when the user grants a device in the chooser, so picks are added
// by hand.
import { GARMIN_VENDOR_ID, isGarminDevice } from './garmin.js'

export interface UsbLike {
  getDevices(): Promise<USBDevice[]>
  requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>
  addEventListener(type: 'connect' | 'disconnect', listener: (e: { device: USBDevice }) => void): void
}

export interface KnownWatches {
  /** Settles once the allowed devices have been read at startup. */
  ready: Promise<void>
  list(): USBDevice[]
  /** The one known watch, or the chooser (called at once, so it stays inside the click). */
  pick(): Promise<USBDevice>
  /** Always the chooser; the picked watch joins the list. */
  choose(): Promise<USBDevice>
  /** Drop a watch that failed to open, so the next pick asks instead of reusing it. */
  forget(device: USBDevice): void
}

export function createKnownWatches(usb: UsbLike): KnownWatches {
  const known: USBDevice[] = []
  const add = (d: USBDevice) => {
    if (isGarminDevice(d) && !known.includes(d)) known.push(d)
  }
  const remove = (d: USBDevice) => {
    const i = known.indexOf(d)
    if (i >= 0) known.splice(i, 1)
  }
  usb.addEventListener('connect', (e) => add(e.device))
  usb.addEventListener('disconnect', (e) => remove(e.device))
  const ready = usb.getDevices().then(
    (devices) => devices.forEach(add),
    () => undefined,
  )

  function choose(): Promise<USBDevice> {
    return usb.requestDevice({ filters: [{ vendorId: GARMIN_VENDOR_ID }] }).then((d) => {
      add(d)
      return d
    })
  }

  return {
    ready,
    list: () => [...known],
    pick: () => (known.length === 1 ? Promise.resolve(known[0]) : choose()),
    choose,
    forget: remove,
  }
}
