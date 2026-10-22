# T3 native integration contract

This is a proposed host integration. This repository does not install a T3
settings page or intercept its delegation calls.

## Settings

The proposed **Agent routing** control offers **Off** and **Topo**. Its objective
control offers **Maximize speed** and **Minimize cost**. No objective is selected
implicitly. Environment settings can have project overrides. An explicit null
objective clears an inherited choice.

`resolveTopoSettings(environment, project)` implements that resolution in the
typed module. The environment supplies `router` and `objective`; the project can
override either. These are Topo's proposed host settings, not T3's released schema.

The portable skill supports recommendations only. A separate local T3 prototype
has exercised target-less routing, but it is not official native support or a
released T3 feature.

## Host call

1. Resolve the settings and preserve any explicit user model choice.
2. Obtain a fresh `orchestrator_capabilities` result. Apply the project's account
   restrictions before preparing bindings.
3. Supply the structured task, pinned publication, explicit policy, and catalog
   to `recommendTopo(request, publication)`. The portable CLI offers the same call.
4. Record the returned snapshot, decision, exclusions, and limitations. On
   abstention, leave the target unset rather than inherit an arbitrary default.
5. During an authorized pilot, recheck availability and pass the selected
   `target` unchanged to `delegate_task`. Supply a self-contained task, stable
   `clientRequestId`, and appropriate isolation. Retain its `taskId`.

The host owns dispatch and tool permissions. Topo neither receives credentials
nor widens runtime modes. A reported child completion still needs acceptance checks.

The native hook needs a generic routing-policy interface in T3. Topo is one
implementation; Workbench measurements remain independently usable. A hook in
the T3 `delegate_task` path alone does not cover provider-native spawn tools.
Enforcement must cover those paths or explicitly document their exclusion.

## Qualification before activation

- Test held-out task descriptions and workload mappings against observed outcomes.
- Test exact model options across the supported T3 providers and accounts.
- Exercise unavailable models, limits, cancellation, idempotent retry, nested
  tasks, result delivery, and workspace isolation.
- Record dispatch-path coverage and the exact T3 version used.
- Define bounded fallback under the same account and quality policy.

## Local prototype status

The local prototype defaults to Off. It accepts environment settings and project
objective overrides. It routes only a first, target-less T3-owned
`delegate_task` call. Explicit targets and accepted-command replay bypass
routing. Provider-native spawn remains outside the hook.

One isolated Codex dispatch, focused tests, server type checking, and
authenticated web settings checks passed in the prototype checkout. That proof
does not establish classification accuracy, savings, cross-provider equivalence,
installed production activation, mobile coverage, or Electron coverage. Local
executable configuration is operator-local and cannot be set through T3 RPC or
project settings.

The proposal is awaiting maintainer direction. No upstream T3 pull request,
official release, or native installation source exists.

The released baseline inspected for this contract is T3 v0.1.0, Orchestrator V2.
The authoritative inputs are the live tools and these upstream sources:

- [Model selection and delegation schema](https://github.com/pingdotgg/t3code/blob/v0.1.0/packages/contracts/src/orchestratorMcp.ts)
- [Delegation handler](https://github.com/pingdotgg/t3code/blob/v0.1.0/apps/server/src/mcp/OrchestratorMcpService.ts)
- [Project settings](https://github.com/pingdotgg/t3code/blob/v0.1.0/docs/user/project-settings.md)
