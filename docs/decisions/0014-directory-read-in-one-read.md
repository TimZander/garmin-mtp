---
status: accepted
date: 2026-11-24
decision-makers: Claude; the owner chose to measure first and approved the change
---
# A map's directory is read in one read, sized by the IMG's own entry

## Context and Problem Statement

Header reading walked a map's directory one 512-byte entry per read. On a watch each read is one
GetPartialObject. A map with a large directory took up to 128 reads (the 64 KiB budget). Is the cost
the number of reads or the bytes, and how should the walk change?

## Evidence

The owner timed reads on an Enduro 3 over WebUSB from Android Chrome, with a throwaway read-only
page, across 23 maps from 10 KB to 4 GB:

- On every map above about 1 MB, one read took about 100 ms whatever its size: 512 B, 4 KB and
  64 KB alike. Eight 512 B reads took about 800 ms; one 4 KB read of the same bytes, about 100 ms.
- Small maps answered faster (6 to 60 ms per read), with the same pattern.
- Every 64 KB read came back whole.
- Today's walk took 12.8 s on each large map (128 reads).

So the number of reads is the cost. The owner asked for this measurement before any change was
made, because the cause had been assumed.

## Considered Options

- Size one read by the IMG's own directory entry (blank name, size = where the entries end), going
  one entry past it, within the budget, keeping room for a TYP header.
- Trust the own entry's size as the directory's end.
- Read fixed-size chunks without the own entry.
- Raise the budget.

## Decision Outcome

Chosen: "size one read by the own entry". Its size only sizes the read: the walk still ends at the
first entry that doesn't start with 1, so a directory that runs past the size is still read in full.
Trusting the size could hide a `GMP` entry and class a map as deletable. A fixed chunk can run past
a small file's end, and on a watch such a read may fail rather than come back short. Raising the
budget is a separate decision about bytes.

The own entry's part field is 3, not 0, in mkgmap's maps and in a third-party map, so the check
doesn't look at the part field (first found when the tests failed).

### Consequences

- Good, because a large map's headers take about 4 reads (around 0.4 s on the measured watch), not
  128 (12.8 s); an mkgmap map takes about 5, not 12 to 31.
- Good, because results are those of the old walk, which the tests check.
- Neutral: a map without an own entry is read as before.
