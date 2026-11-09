# CLAUDE.md

Guidance for agents working in this repository.

## Spec-driven workflow

@.claude/sdd-workflow.md

## Project

<!-- Stack, commands, and rules specific to this repository. -->

- **This repository is public.** Its code comes from a private app: before each PR, scan the
  diff for private material (the app's ADR text, issue numbers, secrets, internal hostnames).
- **A release workflow keeps the publish credential in one job that runs no project code**, as
  `webusb-mtp`'s does.
