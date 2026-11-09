## Purpose

Recognise Garmin devices over WebUSB, tell a watch in Garmin mode from one that speaks MTP, and
keep the list of known watches that decides whether the browser's device chooser is needed.

## ADDED Requirements

### Requirement: Garmin devices are recognised by vendor id
The library SHALL treat a USB device as a Garmin device exactly when its vendor id is `0x091E`,
and SHALL offer that id to callers.

#### Scenario: Garmin and other devices
- **WHEN** devices with vendor ids `0x091E` and `0x1234` are checked
- **THEN** only the first counts as a Garmin device

### Requirement: Garmin mode is recognised
A Garmin device with product id `0x0003` is in Garmin mode, which uses Garmin's own USB protocol
rather than MTP. Connecting to such a device SHALL fail with an error of kind `garmin-mode`
before the device is opened or any MTP operation is sent.

#### Scenario: Watch in Garmin mode
- **WHEN** a client connects to vendor `0x091E`, product `0x0003`
- **THEN** the connection fails with kind `garmin-mode`, the device is not opened, no interface is claimed and no MTP operation is sent

### Requirement: Known watches start from the allowed devices
A known-watches list SHALL start from the Garmin devices the browser already lets the page use,
leave out every other device, and be ready once those have been read. A failure to read them SHALL
leave the list empty and still ready.

#### Scenario: Allowed devices at start
- **WHEN** the browser allows a Garmin device and a device with vendor id `0x1234`
- **THEN** once ready, the list holds only the Garmin device

#### Scenario: Allowed devices can't be read
- **WHEN** reading the allowed devices fails
- **THEN** the list is ready and empty

### Requirement: Known watches follow plugging in and out
The list SHALL add a Garmin device the browser reports connected, at most once, and SHALL remove a
device the browser reports disconnected.

#### Scenario: Plugged in and out
- **WHEN** an allowed Garmin watch is reported connected, then connected again, then disconnected
- **THEN** the list holds it once after the connects and not after the disconnect

### Requirement: One known watch is picked without the chooser
Picking a watch SHALL return the one known watch without opening the chooser when exactly one is
known. Otherwise it SHALL request the browser's chooser at once, in the same call so it stays
within the user's click, with the single filter vendor id `0x091E`.

#### Scenario: One known watch
- **WHEN** exactly one Garmin watch is known and a watch is picked
- **THEN** that watch is returned and the chooser is not requested

#### Scenario: None or two known
- **WHEN** no watch, or two watches, are known and a watch is picked
- **THEN** the chooser is requested synchronously in that call, with the filter vendor id `0x091E` only

### Requirement: A watch can always be chosen
Choosing a watch SHALL always request the chooser with the Garmin filter. A watch picked in the
chooser SHALL join the list; a closed chooser SHALL reject and add nothing.

#### Scenario: Picked in the chooser
- **WHEN** the chooser returns a Garmin watch that wasn't known
- **THEN** the watch is returned and the list now holds it

#### Scenario: Chooser closed
- **WHEN** the user closes the chooser without picking
- **THEN** the call rejects and the list is unchanged

### Requirement: A watch that failed to open can be forgotten
The list SHALL let the caller forget a watch, for one that failed to open, so the next pick asks
through the chooser instead of reusing it.

#### Scenario: Forgotten watch
- **WHEN** the one known watch is forgotten and a watch is picked
- **THEN** the chooser is requested
