// Garmin's USB vendor id. Every Garmin watch reports it, in MTP mode and in Garmin mode.
export const GARMIN_VENDOR_ID = 0x091e

export function isGarminDevice(device: Pick<USBDevice, 'vendorId'>): boolean {
  return device.vendorId === GARMIN_VENDOR_ID
}
