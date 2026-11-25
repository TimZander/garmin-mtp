---
status: accepted
date: 2026-11-25
decision-makers: Claude
---
# Update sdd from 0.3.4 to 0.4.4

## Context and Problem Statement

The owner asked for every sdd repository to move to the plugin's current version. This one was on
0.3.4. Verify in sdd before 0.4.3 fails an archive commit; 0.4.4 brings spec review's pass I
questions. Azure DevOps support (`sdd-azure*`) also arrives in the plugin scripts.

## Considered Options

- Update now with `/sdd:init`.
- Stay on 0.3.4 until the next change needs it.

## Decision Outcome

Chosen option: "update now", because the next archive would otherwise fail verification.

- `/sdd:init` printed no `warning:` lines. Host: github, from the default.
- Deletion check: the diff of `.claude/sdd-workflow.md` removes only lines the new version
  rewords (the "On GitHub" and Azure DevOps wording); no rule this repository added was lost.
- Local checks: `check-specs.sh --worktree`, typecheck and tests (117) pass. No active change.

### Consequences

- Good, because archives verify under the current scripts.
- Bad, because CI checks this PR with the old scripts; the local run is the real check.
