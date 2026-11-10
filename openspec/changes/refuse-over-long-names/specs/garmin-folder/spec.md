## ADDED Requirements

### Requirement: A name longer than MTP allows is refused before sending
Sending SHALL refuse a name longer than an MTP string holds, 254 UTF-16 code units, with kind
`name-too-long` and a message giving the name's length and the limit, before any operation is
sent, any progress is reported or the file is logged as announced.

#### Scenario: Name one unit too long
- **WHEN** a file is sent as 251 `a`s followed by `.img` (255 units)
- **THEN** sending fails with kind `name-too-long` and a message containing 255 and 254, the send sends no operation and reports no progress, the log doesn't say the file was announced, and the device stays open

#### Scenario: Longest name accepted
- **WHEN** a file is sent as 250 `a`s followed by `.img` (254 units)
- **THEN** the file is sent and verified under that name

#### Scenario: Counted in UTF-16 units
- **WHEN** a file is sent as 126 `🗺` (each two UTF-16 units) followed by `.img`: 130 characters, 256 units
- **THEN** sending fails with kind `name-too-long`

## MODIFIED Requirements

### Requirement: Failures are errors with a kind
Every failure SHALL be an error with one of the kinds `garmin-mode`, `no-interface`, `setup`,
`setup-timeout`, `no-session`, `no-garmin-folder`, `response`, `broken`, `timeout`, `mismatch` or
`name-too-long`. Errors of kind `response`, `broken` and `timeout` SHALL give the code of the
operation being run (OpenSession for the whole reopen), and a `response` the response code. A
failure while connecting SHALL release whatever was opened.

#### Scenario: Operation times out while connecting
- **WHEN** the watch doesn't answer GetStorageIDs within the timeout
- **THEN** connecting fails with kind `timeout`, a message naming GetStorageIDs, and the device is closed

#### Scenario: Times out during the reopen
- **WHEN** the first OpenSession is answered `0x201E` and the watch doesn't answer the second within the timeout
- **THEN** connecting fails with kind `timeout`, operation `0x1002`, and the device is closed

#### Scenario: Refused while connecting
- **WHEN** GetStorageIDs is answered `0x2002`
- **THEN** connecting fails with kind `response`, operation `0x1004`, response code `0x2002`, and the device is closed

### Requirement: What a failure leaves of the connection
After connecting, a `response` SHALL leave the connection usable, except a write the watch
answered before taking its data, which closes the device. `broken` and `timeout` SHALL mean the
device was closed. A `mismatch` or a `name-too-long` SHALL leave the connection usable.

#### Scenario: Refused delete
- **WHEN** DeleteObject is answered `0x200D`
- **THEN** the error has kind `response`, operation `0x100B`, response code `0x200D`, and the session isn't broken

#### Scenario: Watch answers before taking the data
- **WHEN** the watch answers SendObjectInfo with `0x2002` before accepting its file information
- **THEN** sending fails with kind `response`, response code `0x2002`, and the device is closed

#### Scenario: Name refused, connection kept
- **WHEN** sending fails with kind `name-too-long`
- **THEN** the session isn't broken, and the free space can still be read

### Requirement: A failed send says whether a partial file may be left
A send refused before its announcement, or refused at its announcement, SHALL be marked as leaving
no file. A failure after the announcement was answered, or an announcement that timed out or
broke, SHALL be marked as possibly leaving a partial file.

#### Scenario: Name refused before the announcement
- **WHEN** sending fails with kind `name-too-long`
- **THEN** the error is not marked as leaving a partial file

#### Scenario: Announcement refused
- **WHEN** SendObjectInfo is answered `0x200C` after the watch accepted its file information
- **THEN** sending fails with kind `response`, not marked as leaving a partial file, and the session isn't broken

#### Scenario: Transfer breaks
- **WHEN** the USB transfer throws during SendObject
- **THEN** sending fails with kind `broken`, marked as possibly leaving a partial file, and the device is closed

#### Scenario: Send stalls
- **WHEN** the watch stops taking data partway through SendObject for longer than the timeout
- **THEN** sending fails with kind `timeout`, marked as possibly leaving a partial file, and the device is closed

#### Scenario: Announcement gets no answer
- **WHEN** the watch doesn't answer SendObjectInfo within the write timeout
- **THEN** sending fails with kind `timeout`, marked as possibly leaving a partial file

### Requirement: Connecting and sending log their steps
The log SHALL also get, as diagnostics: each USB setup step; why connecting failed; a refused
name, with its length and the limit; the model, when GetDeviceInfo answers; the `GARMIN` folder,
with its object count and free space; each send's announcement; the file information sent, as hex;
what the watch accepted; the name and size read back; and `webusb-mtp`'s notes (an early answer,
and the device's status and the cancel after a write gets no answer).

#### Scenario: A write gets no answer
- **WHEN** the watch doesn't answer SendObjectInfo within the write timeout
- **THEN** before the timeout is reported, the log has the device's MTP status and the cancel request

#### Scenario: A send's diagnostics
- **WHEN** a 10-byte file `a.img` is sent
- **THEN** the log has a line announcing `a.img`, a hex dump of the file information, a line that the watch accepted all 10 bytes, and `Read back: a.img, 10 bytes`

#### Scenario: A refused name's diagnostics
- **WHEN** a file named with 255 UTF-16 units is sent
- **THEN** the log has an error line giving 255 and 254
