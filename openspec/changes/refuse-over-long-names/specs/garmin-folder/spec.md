## ADDED Requirements

### Requirement: A name longer than MTP allows is refused before sending
Sending SHALL refuse a name longer than an MTP string holds, 254 UTF-16 code units, with kind
`name-too-long`, before any operation is sent or the file is logged as announced. The error SHALL
be marked as leaving no file, and the connection SHALL stay usable.

#### Scenario: Name one unit too long
- **WHEN** a file is sent as 251 `a`s followed by `.img` (255 units)
- **THEN** sending fails with kind `name-too-long`, not marked as leaving a partial file, no operation is sent after connecting, the device stays open, and the free space can still be read

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
