## 1. Tests first

- [x] 1.1 Tests in `test/imgHeader.test.ts` for the new scenarios, citing the requirement: read counts for the mkgmap fixture and a 200-entry directory with its own entry; no own entry reads one entry per read; a GMP entry past the own entry's size is still seen
- [x] 1.2 See them fail against the current walk (11 and 128 reads); later a truncated-bulk-read test

## 2. Code

- [x] 2.1 One shared directory walk in `src/imgHeader.ts`, used by `readImgFamilyId` and `readImgInfo`
- [x] 2.2 Type check, tests (116) and build pass

## 3. Review and records

- [x] 3.1 Spec review
- [x] 3.2 Conformance review (one fresh review of both, after the code): 2 blockers, 3 gaps, 1 doubt; short bulk reads now keep the entries before the cut, the GMP test moved one entry past the size, the spec names the size field; overstated own entries accepted in design.md
- [x] 3.3 ADRs: the bulk read sized by the own entry; how the change was run
