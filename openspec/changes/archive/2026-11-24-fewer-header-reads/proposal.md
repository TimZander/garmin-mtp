## Why

Reading a map's header info walks the map's directory one 512-byte entry per read. On a watch each
read is one GetPartialObject round trip, so a map with a large directory costs up to 128 round
trips (the 64 KiB budget), and a small mkgmap map about a dozen. An app that lists a watch's maps
waits minutes for large Garmin maps. The bytes read are few; the round trips are the cost.

An IMG's first directory entry describes the IMG's own header and directory: a blank name and a size giving where the directory ends. Knowing that end, the rest of the directory can be
asked for in one read.

## What Changes

- `readImgInfo` and `readImgFamilyId` (and so `readMapInfo` and `readFamilyId`) read the header,
  then the first directory entry, then, when that entry is the IMG's own, everything from the
  second entry to one entry past its end in one read, cut to the budget.
- Without such an entry they read one entry per read, as now.
- The results are the same as before; the budget rule is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `img-headers`: a new requirement that the directory is read in few reads.

## Impact

- `src/imgHeader.ts` and `test/imgHeader.test.ts`; no public API change.
- Released afterwards as a patch version through the existing release workflow, not part of this
  change.
