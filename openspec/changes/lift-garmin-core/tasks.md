## 1. Tests first

- [x] 1.1 Copy the app's `knownWatches`, client and header-reader tests into `test/`, with imports from `webusb-mtp` and `src/`, a small test log, `webusb-mtp`'s fake USB device and the two IMG fixtures
- [x] 1.2 Change the marker tests to `carriesMarker` and `mapOrigin`'s `'marked'`, with the marker passed in
- [x] 1.3 Add tests for scenarios the app's tests don't cover: vendor id check, allowed devices that can't be read, a refused GetDeviceInfo, no MTP interface, a refused reopen, a refused delete's code, a read that throws, a renamed TYP entry, a map with no records and no marker, no event read pending after a failed connect, a repeated connect event, header reads made only with GetPartialObject, a first TYP that isn't a Garmin TYP, a refused or other-code OpenSession, a refused CloseSession during reopen, an early answer to SendObjectInfo, a refusal while connecting, the caller's timeout, a send's diagnostic lines and the model line, the status logged after a write gets no answer
- [x] 1.4 See the new tests fail before the code is in place

## 2. Code

- [x] 2.1 `src/garmin.ts`: the vendor id and `isGarminDevice`
- [x] 2.2 `src/knownWatches.ts`, `src/client.ts` and `src/imgHeader.ts`, lifted with imports from `webusb-mtp`, without the app's marker
- [x] 2.3 `src/index.ts` exporting the public API
- [x] 2.4 Tests, type check and build pass

## 3. Package and CI

- [x] 3.1 `package.json`: name, version, MIT, `type: module`, `exports`, `types`, `files`, scripts, `webusb-mtp` `^0.1.0` from npm; `tsconfig.json` and `tsconfig.build.json`
- [x] 3.2 `.github/workflows/ci.yml`: `npm ci`, type check, tests, build
- [x] 3.3 README and `CLAUDE.md`'s project section

## 4. Review and records

- [ ] 4.1 Conformance review
- [ ] 4.2 ADRs and lessons
- [ ] 4.3 Scan the diff for private material from the app
