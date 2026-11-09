/// <reference types="w3c-web-usb" preserve="true" />
// The public API: the Garmin USB facts, the known-watches list, the watch client and the IMG
// header reader. The MTP layer itself is `webusb-mtp`'s.
export * from './garmin.js'
export * from './knownWatches.js'
export * from './imgHeader.js'
export * from './client.js'
