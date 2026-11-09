## 1. Tests first

- [ ] 1.1 Copy the app's `knownWatches`, client and header-reader tests into `test/`, with imports from `webusb-mtp` and `src/`, a small test log, `webusb-mtp`'s fake USB device and the two IMG fixtures
- [ ] 1.2 Change the marker tests to `carriesMarker` and `mapOrigin`'s `'marked'`, with the marker passed in
- [ ] 1.3 Add tests for scenarios the app's tests don't cover: vendor id check, allowed devices that can't be read, a refused GetDeviceInfo, no MTP interface, a refused reopen, a refused delete's code, a read that throws, a renamed TYP entry, a map with no records and no marker, no event read pending after a failed connect
- [ ] 1.4 See the new tests fail before the code is in place

## 2. Code

- [ ] 2.1 `src/garmin.ts`: the vendor id, Garmin mode's product id and `isGarminDevice`
- [ ] 2.2 `src/knownWatches.ts`, `src/client.ts` and `src/imgHeader.ts`, lifted with imports from `webusb-mtp`, without the app's marker
- [ ] 2.3 `src/index.ts` exporting the public API
- [ ] 2.4 Tests, type check and build pass

## 3. Package and CI

- [ ] 3.1 `package.json`: name, version, MIT, `type: module`, `exports`, `types`, `files`, scripts, `webusb-mtp` pinned; `tsconfig.json` and `tsconfig.build.json` with the path alias; vitest alias
- [ ] 3.2 `.github/workflows/ci.yml`: `npm ci`, type check, tests, build
- [ ] 3.3 README and `CLAUDE.md`'s project section

## 4. Review and records

- [ ] 4.1 Conformance review
- [ ] 4.2 ADRs and lessons
- [ ] 4.3 Scan the diff for private material from the app
