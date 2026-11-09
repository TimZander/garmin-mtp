## Purpose

Connect to a Garmin watch over MTP, find its `GARMIN` folder, and send, verify and delete files
there, with errors that say which step failed and what state the watch was left in.

## ADDED Requirements

### Requirement: Connecting takes the caller's timeouts
Connecting SHALL take an optional timeout, used for each USB setup call and each MTP operation,
and an optional write timeout, used for the watch's answer to SendObjectInfo and SendObject. When
either is left out, `webusb-mtp`'s default applies.

#### Scenario: Timeout given
- **WHEN** a client connects with a timeout of 20 ms and the watch doesn't answer GetStorageIDs
- **THEN** connecting fails with kind `timeout` after about 20 ms, not after the default

### Requirement: Connecting finds the GARMIN folder
Connecting SHALL claim the watch's MTP interface, open a session and return a connection to the
folder named `GARMIN` (any case) at the root of the first storage, in the watch's order, that has
one: the storage, its free space, the watch's model, and every object directly in that folder,
folders included, with the `.img` files (any case, not folders) listed apart. When GetDeviceInfo is
refused or reports no model, the model SHALL be `Garmin watch`.

#### Scenario: Watch with a GARMIN folder
- **WHEN** a watch's storage root holds `Music` and `GARMIN`, and `GARMIN` holds `trail.img`, a folder `Courses` and `device.fit`
- **THEN** the connection names that `GARMIN` folder and the storage's free space, lists all three objects, and lists only `trail.img` as a map file

#### Scenario: Only folders and .img files count
- **WHEN** a storage root holds a file named `GARMIN` and a folder `Garmin`, and that folder holds `TRAIL.IMG` and a folder `old.img`
- **THEN** the connection uses the folder, and lists `TRAIL.IMG` as a map file but not `old.img`

#### Scenario: Second storage has the folder
- **WHEN** the first storage's root has no `GARMIN` folder and the second's has one named `Garmin`
- **THEN** the connection uses the second storage, its free space and its `Garmin` folder

#### Scenario: Model unknown
- **WHEN** the watch refuses GetDeviceInfo
- **THEN** connecting still succeeds, and the model is `Garmin watch`

#### Scenario: No model reported
- **WHEN** GetDeviceInfo answers with an empty model
- **THEN** the model is `Garmin watch`

### Requirement: A watch without a GARMIN folder is refused
When no storage root holds a `GARMIN` folder, connecting SHALL fail with kind `no-garmin-folder`,
create nothing, close the session and close the device.

#### Scenario: No GARMIN folder
- **WHEN** the only folder at the watch's root is `Music`
- **THEN** connecting fails with kind `no-garmin-folder`, no object is sent, CloseSession is the last operation and the device is closed

### Requirement: Connecting reports why it couldn't start
Connecting SHALL fail with kind `no-interface`, opening nothing, when the watch offers no MTP
interface, and with kind `setup` or `setup-timeout`, naming the step and closing the device, when
opening, configuring, claiming or selecting the interface throws or doesn't complete in time.

#### Scenario: Claim refused
- **WHEN** claiming the interface throws "Unable to claim interface."
- **THEN** connecting fails with kind `setup`, step `claimInterface`, a message containing that text, and the device is closed

#### Scenario: Claim never completes
- **WHEN** claiming the interface doesn't complete within the timeout
- **THEN** connecting fails with kind `setup-timeout`, step `claimInterface`, and the device is closed

#### Scenario: No MTP interface
- **WHEN** the watch's configuration has no interface with bulk IN, bulk OUT and interrupt IN endpoints
- **THEN** connecting fails with kind `no-interface`, and the device is neither opened nor claimed

### Requirement: A session left open by another app is reopened
When OpenSession is answered SessionAlreadyOpen (`0x201E`), connecting SHALL send CloseSession,
then OpenSession again even if CloseSession is refused, log that it reopened the session, and go
on. When OpenSession is refused with any other code, or the second OpenSession is refused,
connecting SHALL fail with kind `no-session`.

#### Scenario: Stale session
- **WHEN** the watch answers the first OpenSession with `0x201E`
- **THEN** the operations sent begin GetDeviceInfo, OpenSession, CloseSession, OpenSession, the log says the session was reopened, and the connection is returned

#### Scenario: Stale session that can't be closed
- **WHEN** the first OpenSession is answered `0x201E`, CloseSession `0x2002`, and the second OpenSession OK
- **THEN** the connection is returned

#### Scenario: Reopen refused
- **WHEN** both OpenSessions are answered `0x201E`
- **THEN** connecting fails with kind `no-session`

#### Scenario: Session refused outright
- **WHEN** OpenSession is answered `0x2005`
- **THEN** connecting fails with kind `no-session`

### Requirement: Failures are errors with a kind
Every failure SHALL be an error with one of the kinds `garmin-mode`, `no-interface`, `setup`,
`setup-timeout`, `no-session`, `no-garmin-folder`, `response`, `broken`, `timeout` or `mismatch`.
Errors of kind `response`, `broken` and `timeout` SHALL give the code of the operation being run
(OpenSession for the whole reopen), and a `response` the response code. A failure while connecting
SHALL release whatever was opened.

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
device was closed. A `mismatch` SHALL leave the connection usable.

#### Scenario: Refused delete
- **WHEN** DeleteObject is answered `0x200D`
- **THEN** the error has kind `response`, operation `0x100B`, response code `0x200D`, and the session isn't broken

#### Scenario: Watch answers before taking the data
- **WHEN** the watch answers SendObjectInfo with `0x2002` before accepting its file information
- **THEN** sending fails with kind `response`, response code `0x2002`, and the device is closed

### Requirement: A file is sent into GARMIN and verified
Sending SHALL announce the file in `GARMIN` under the given name, with its size and the given
time as created and modified date (`YYYYMMDDThhmmss`, local), send its bytes reporting progress
from 0 to 1, read the new object's info back, and return it only when its name and size match.

#### Scenario: Sent and verified
- **WHEN** a 150,000-byte file is sent as `trail.img` at 25 October 2026, 17:30:05 local time
- **THEN** the watch holds those bytes as `trail.img` in `GARMIN`, its dates are `20261025T173005`, the last progress is 1, and the result names `trail.img` with 150,000 bytes

#### Scenario: Name read back differs
- **WHEN** after sending `trail.img` the watch reports the file as `TRAIL.IMG`
- **THEN** sending fails with kind `mismatch`, marked as possibly leaving a partial file

#### Scenario: Size read back differs
- **WHEN** after a 1,000-byte send the watch reports the file with 999 bytes
- **THEN** sending fails with kind `mismatch` and a message giving both sizes, marked as possibly leaving a partial file

### Requirement: A failed send says whether a partial file may be left
A send refused at its announcement SHALL be marked as leaving no file. A failure after the
announcement was answered, or an announcement that timed out or broke, SHALL be marked as
possibly leaving a partial file.

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

### Requirement: The library deletes only what it is asked to
Sending SHALL never delete anything, even when a file of the same name exists. Deleting SHALL
remove exactly the object the caller names, and nothing else; it doesn't check where the file came
from, which is the caller's decision (`img-headers` classifies maps).

#### Scenario: Send beside a same-name file
- **WHEN** a file is sent and `GARMIN` already holds one of that name
- **THEN** no DeleteObject is sent

#### Scenario: Delete one file
- **WHEN** the caller deletes the object with handle 3
- **THEN** exactly one DeleteObject is sent, for handle 3, and the other objects remain

### Requirement: Free space can be read again
Reading the free space SHALL ask the watch for the storage holding `GARMIN` again, return its free
space and keep it on the connection.

#### Scenario: After a delete
- **WHEN** the free space changes from 1,000,000 to 4,000,000 bytes and it is read again
- **THEN** 4,000,000 is returned and the connection's free space is 4,000,000

### Requirement: The watch is released on close and on failure
Closing SHALL send CloseSession unless the connection broke, then release the interface and
close the device, and never throw. A failed connect SHALL release the watch the same way.
Neither SHALL leave an event read pending.

#### Scenario: Close after use
- **WHEN** a connection is closed
- **THEN** CloseSession is the last operation sent, the device is closed, and no event read is pending

#### Scenario: Close after a broken transfer
- **WHEN** a transfer broke and the connection is then closed
- **THEN** no further operation is sent

#### Scenario: Failed connect
- **WHEN** connecting fails because no `GARMIN` folder exists
- **THEN** the device is closed and no event read is pending

### Requirement: Events are read and logged while connected
While connected, the watch's MTP events SHALL be read, so a watch that holds an answer until its
event has been read isn't left waiting, and each SHALL be logged with its name, code and
parameters.

#### Scenario: Answer held until the event is read
- **WHEN** the watch queues ObjectAdded after SendObjectInfo and answers only once that event is read
- **THEN** the send completes, and the log has `Event: ObjectAdded (0x4002)` with the new handle as its parameter

### Requirement: Operations are logged without serial numbers
Every answered operation SHALL be logged with its name, code, response name and code, and
SendObjectInfo and SendObject also with how long the watch took to answer. The device's USB serial
SHALL be handed to the log for redaction before anything is logged, and its MTP serial as soon as
GetDeviceInfo returns it, before any later line.

#### Scenario: Slow write logged
- **WHEN** the watch answers SendObjectInfo after 40 ms
- **THEN** the log has `SendObjectInfo (0x100C) → OK (0x2001) after` followed by the seconds taken

#### Scenario: Serial numbers redacted
- **WHEN** the device's USB serial is `USB11111` and its MTP serial is `MTP22222`, and the log removes what it is handed
- **THEN** neither appears in the log

### Requirement: Connecting and sending log their steps
The log SHALL also get, as diagnostics: each USB setup step; why connecting failed; the model,
when GetDeviceInfo answers; the `GARMIN` folder, with its object count and free space; each send's
announcement; the file information sent, as hex; what the watch accepted; the name and size read
back; and `webusb-mtp`'s notes (an early answer, and the device's status and the cancel after a
write gets no answer).

#### Scenario: A write gets no answer
- **WHEN** the watch doesn't answer SendObjectInfo within the write timeout
- **THEN** before the timeout is reported, the log has the device's MTP status and the cancel request

#### Scenario: A send's diagnostics
- **WHEN** a 10-byte file `a.img` is sent
- **THEN** the log has a line announcing `a.img`, a hex dump of the file information, a line that the watch accepted all 10 bytes, and `Read back: a.img, 10 bytes`

### Requirement: Map files are read through their headers only
The connection SHALL read a map file's family id or header info through partial reads of that
file, as `img-headers` defines, never fetching the whole file, and never throwing. A partial read
that times out or breaks SHALL still close the device, as any operation does.

#### Scenario: Header info of a map on the watch
- **WHEN** `GARMIN` holds an mkgmap map with family id 4242 and its header info is read
- **THEN** it gives family id 4242 from the TYP subfile, using only GetPartialObject reads of that file

#### Scenario: Unreadable file
- **WHEN** reading a file's header fails
- **THEN** the family id is unknown with a reason, and nothing is thrown
