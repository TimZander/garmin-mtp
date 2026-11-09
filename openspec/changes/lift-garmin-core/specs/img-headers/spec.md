## Purpose

Read what a Garmin map file's headers say (family id, description, map records, how it was made)
through partial reads within a fixed budget, and decide from that whether a map may be deleted.

## ADDED Requirements

### Requirement: Headers are read within a budget
Header reading SHALL go through a caller's read-at function only, and SHALL read at most a budget
of bytes in total from a file, 64 KiB by default, wherever in the file they lie. A read that would
pass the budget SHALL not be made.

#### Scenario: Huge directory
- **WHEN** a file's directory has 200 entries and none is a TYP or MPS subfile
- **THEN** at most 64 KiB is read, the family id is unknown with a reason naming the 64 KB limit, and the directory is incomplete

### Requirement: Header reading never throws
When a file isn't a Garmin IMG file (no `DSKIMG` at `0x10`), has an implausible layout (block
size exponent outside 9 to 24, or a directory start before `0x200`), is shorter than a read, or a
read throws, header reading SHALL return a result saying why instead of throwing.

#### Scenario: Not an IMG file
- **WHEN** a 4,096-byte file of zeros is read
- **THEN** the family id is unknown, saying it isn't a Garmin IMG file, the description is empty and the directory is incomplete

#### Scenario: Impossible block size
- **WHEN** a map's block size exponent is 30
- **THEN** the family id is unknown, saying the layout or block size is implausible

#### Scenario: Truncated file
- **WHEN** only a map's first `0x300` bytes exist
- **THEN** the family id is unknown and the directory is incomplete

#### Scenario: Read throws
- **WHEN** the read-at function throws "device gone"
- **THEN** the family id is unknown with that reason

### Requirement: The family id comes from TYP, then MPS
The family id SHALL be the u16 at `0x2F` of the first TYP subfile whose header says `GARMIN TYP`,
else the family id of the first map (`L`) or family (`F`) record of the first MPS subfile, else
unknown with a reason. A TYP family found before the budget runs out SHALL be kept.

#### Scenario: mkgmap map
- **WHEN** an mkgmap map built with family id 4242 is read
- **THEN** its family id is 4242, from TYP

#### Scenario: No TYP subfile
- **WHEN** the same map's TYP directory entry is renamed
- **THEN** its family id is 4242, from MPS

#### Scenario: Budget runs out in the directory
- **WHEN** the budget is just enough to reach the TYP subfile but not the end of the directory
- **THEN** the family id is still the TYP's

### Requirement: The header description is read
The header info SHALL give the IMG header's description: the 20 bytes at `0x49` followed by the
31 bytes at `0x65`, with NULs removed and trailing spaces trimmed, read even when the directory
outruns the budget.

#### Scenario: Map with a description
- **WHEN** a map built with description `Marked Map` is read with a budget of `0x200` bytes
- **THEN** its description is `Marked Map`

### Requirement: The header info says how the map was made
The header info SHALL give the area name of every map record in the first MPS subfile, whether
an MPS subfile is named `MAKEGMAP`, whether any subfile is `GMP`, and whether the whole directory
was read. When the map records can't all be read, the area names SHALL be empty.

#### Scenario: mkgmap map
- **WHEN** an mkgmap map whose one map record has area name `Area 42420002` is read
- **THEN** the area names are `Area 42420002`, the MPS is `MAKEGMAP`, there is no GMP and the directory is complete

#### Scenario: GMP subfile
- **WHEN** a map's directory has a `GMP` subfile
- **THEN** the header info says it has a GMP subfile

#### Scenario: No MPS subfile
- **WHEN** a map's MPS directory entry is renamed
- **THEN** the area names are empty and the MPS isn't `MAKEGMAP`

### Requirement: A marker is matched on every map record
A map SHALL count as carrying a marker the caller names only when it has at least one map record
and every map record's area name equals that marker.

#### Scenario: Marked map
- **WHEN** a map whose one map record has area name `example.test` is checked for marker `example.test`
- **THEN** it carries the marker

#### Scenario: Marked and unmarked records
- **WHEN** a map's records have area names `example.test` and `Area 42420002`
- **THEN** it doesn't carry marker `example.test`

#### Scenario: No map records
- **WHEN** a map has no map records
- **THEN** it doesn't carry any marker

### Requirement: Only maps made with mkgmap may be deleted
A map in `GARMIN` SHALL count as made with mkgmap when its whole directory was read, an MPS
subfile is named `MAKEGMAP`, it has no `GMP` subfile, and `GARMIN` holds no `.gma` file (any case,
not a folder) with its base name. Every other map SHALL count as protected. With a marker named,
a made-with-mkgmap map carrying it SHALL count as marked.

#### Scenario: Map made with mkgmap
- **WHEN** `trail.img` has `MAKEGMAP.MPS`, no GMP, a complete directory and no `trail.gma` beside it
- **THEN** it is made with mkgmap

#### Scenario: Same-name .gma file
- **WHEN** `D1234567A.img` is otherwise made with mkgmap and `GARMIN` holds `d1234567a.GMA`
- **THEN** it is protected; a folder named `D1234567A.gma` instead would not make it protected

#### Scenario: GMP, other MPS name or incomplete directory
- **WHEN** a map has a GMP subfile, or its MPS isn't named `MAKEGMAP`, or its directory wasn't read completely
- **THEN** it is protected, whether or not it carries a marker

#### Scenario: Marked map
- **WHEN** a map made with mkgmap carries marker `example.test`, and its origin is asked with that marker
- **THEN** it is marked; asked without a marker, it is made with mkgmap
