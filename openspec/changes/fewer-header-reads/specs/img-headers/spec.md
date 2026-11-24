## ADDED Requirements

### Requirement: The directory is read in few reads
When a map's first directory entry is the IMG's own (blank name, part 0, a size past the directory
start, a multiple of 512), header reading SHALL ask for everything from the second entry to one
entry past that size in one read, cut to whole entries the budget allows while keeping room for a
TYP header until one is read. Otherwise it SHALL read one entry per read. Either way the results
SHALL be those of reading one entry per read.

#### Scenario: mkgmap map
- **WHEN** an mkgmap map with 7 directory entries, the first its own, is read for its header info
- **THEN** at most 5 reads are made, and the family id, area names, MPS name, GMP and directory completeness are as before

#### Scenario: Large directory with its own entry
- **WHEN** a map's own entry says its directory holds 200 entries and none is a TYP or MPS subfile
- **THEN** at most 3 reads are made, at most 64 KiB is read, the family id is unknown with a reason naming the 64 KB limit, and the directory is incomplete

#### Scenario: No own entry
- **WHEN** a map's first directory entry has a name
- **THEN** the directory is read one entry per read, with the same results as before

#### Scenario: Entries past the own entry's size
- **WHEN** a directory entry for a `GMP` subfile follows the size the own entry gives
- **THEN** it is still read: the header info says it has a GMP subfile
