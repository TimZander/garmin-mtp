---
status: accepted
date: 2026-11-09
decision-makers: Claude
---
# How `release-to-npm` was reviewed

## Context and Problem Statement

A workflow that publishes with a credential is high-risk under the sdd rules. It gets a security
review and an attack test as well as the spec and conformance reviews. The design was copied, so how
much reviewing did the copy need, and what did each review find?

## Considered Options

- Trust the copy: only check that the names changed.
- Run the full flow on the copy: spec review, conformance review, security review and an attack test.

## Decision Outcome

Chosen option: "the full flow". The copy adds things `webusb-mtp` didn't have: `private` removed, a
README with no Install section, and a different package name in the tests. A check that only looks
at names would miss a test made too loose by the copy.

- **Spec review, 1 round:** no blocker, 5 should-fixes.
  - H1: the approval gate was assumed, so the owner was asked and answered (ADR 0009).
  - H2: the requirements that rest on open questions 0 and 4 now say so.
  - C1, C2: scenarios added for the trusted publisher and the 15-minute stop.
  - G1: Node 22 and the `latest` tag are now in the spec.
  - The 4 considers were also taken: D1 (the publish job checks out and takes `dist`), D2, D3
    (the phrases that count as "not published") and F1 (the shared token).
  - Not re-run, since no blocker was found.
- **Conformance review, 1 round:** no hard fail, 4 soft fails.
  - S1: the publish job's actions are now pinned to checkout, setup-node and download-artifact.
  - S2: the README checks now match its instructions.
  - R1: tests now refuse a committed `.npmrc` or a `publishConfig`, which could redirect the token.
  - S3: the approval's reliance on GitHub's environment settings is now stated in the spec.
  - Each new test was seen to fail on a mutation.
- **Security review:** no finding at confidence 8 or more.
- **Attack test:** 17 edits an attacker might make to the workflow. Each one fails the tests:
  - a tag trigger;
  - `if: always()`;
  - no environment;
  - the secret given to the tests, spelled three ways;
  - `id-token: write` for the whole workflow;
  - `npm ci` in the publish job;
  - no `--ignore-scripts`;
  - an action pinned to a tag;
  - credentials kept on checkout;
  - `continue-on-error`;
  - `npm@latest`;
  - another registry;
  - `printenv`;
  - a workflow-level token env;
  - an extra action in the publish job.

### Consequences

- Good, because the copy is held to the same tests as the original, plus the registry and actions
  checks that `webusb-mtp` lacks. Those are worth porting back.
- Bad, because npm's own behaviour (OIDC before the token) is still unverified until a release runs
  without the secret (task 4.2).
