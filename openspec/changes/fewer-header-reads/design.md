## Context

See proposal.md. In the two mkgmap fixtures and in a large third-party map (527 entries, 8 KiB
blocks) the first directory entry has an all-space name, part 0, and a size equal to the offset
where the directory's entries end. The IMG format's descriptions agree: that entry is the file
holding the header and directory themselves.

## Goals / Non-Goals

**Goals:** far fewer round trips per map, with results identical to today's walk.

**Non-Goals:** a larger budget; reading subfiles differently; reading several maps in one request.

## Decisions

- **Two reads before the bulk read (header, then the first entry), not one guessed read.** The
  directory start is only known from the header, and asking past a file's end may fail on a watch
  rather than come back short, so nothing is read before its offset and length are known.
- **The bulk read goes one entry past the own entry's size**, which is the entry today's walk reads
  to see the directory end. So the bytes spent and the entries seen are those of today's walk, and
  a directory whose own entry understates it is still walked in full (an entry there makes the walk
  carry on, one entry per read): the own entry only sizes the read and is never trusted to end the
  directory. This matters because a complete directory is one of the conditions for a map to count
  as deletable.
- **Keep room for a TYP header (0x40 bytes) in the bulk read until a TYP has been read**, because
  today's walk reads the TYP header as soon as its entry is seen. Without the room, a budget that
  just reaches the TYP today would be spent on directory entries and lose the TYP family id (the
  "Budget runs out in the directory" scenario).
- **One shared directory walk** for `readImgFamilyId` and `readImgInfo`, so both read alike.
- Rejected: trusting the own entry's size as the directory's end (a map with an understated size
  could hide a `GMP` entry and be classed deletable); fixed-size chunks with no own entry (a chunk
  can run past a small file's end); raising the budget (a separate decision about bytes, not round
  trips).

## Risks / Trade-offs

- A watch that limits the length of one GetPartialObject below 64 KiB would fail the bulk read.
  `webusb-mtp` receives multi-packet data phases, and the app already sends multi-megabyte maps;
  reads of up to 64 KiB are assumed fine (owner's watch check after release).

## Open Questions

None.
