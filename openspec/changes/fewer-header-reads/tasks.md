## 1. Tests first

- [ ] 1.1 Tests in `test/imgHeader.test.ts` for the new scenarios, citing the requirement: read counts for the mkgmap fixture and a 200-entry directory with its own entry; no own entry reads one entry per read; a GMP entry past the own entry's size is still seen
- [ ] 1.2 See them fail against the current walk

## 2. Code

- [ ] 2.1 One shared directory walk in `src/imgHeader.ts`, used by `readImgFamilyId` and `readImgInfo`
- [ ] 2.2 Type check, tests and build pass

## 3. Review and records

- [ ] 3.1 Spec review
- [ ] 3.2 Conformance review
- [ ] 3.3 ADRs: the bulk read sized by the own entry; how the change was run
