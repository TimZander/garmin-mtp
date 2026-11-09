# CLAUDE.md

Guidance for agents working in this repository.

## Spec-driven workflow

@.claude/sdd-workflow.md

## Project

<!-- Stack, commands, and rules specific to this repository. -->

TypeScript library: Garmin watches over WebUSB, browser only, built on `webusb-mtp` (from npm).

- `src/`: `garmin.ts` (vendor id), `knownWatches.ts`, `client.ts` (the `GARMIN` folder client),
  `imgHeader.ts` (IMG headers), `index.ts` (the public API: everything they export).
- `test/`: vitest in Node against `test/fakeMtpDevice.ts`, a copy of `webusb-mtp`'s scripted fake
  `USBDevice`, and the two IMG fixtures in `test/fixtures`.
- Commands: `npm ci`, `npm run typecheck`, `npm test`, `npm run build` (to `dist/`).
- The library never writes to the console.
- **This repository is public.** Its code comes from a private app: before each PR, scan the
  diff for private material (the app's ADR text, issue numbers, secrets, internal hostnames).
- **A release workflow keeps the publish credential in one job that runs no project code**, as
  `webusb-mtp`'s does.

ADR detail: learning
