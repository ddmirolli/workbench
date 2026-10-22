---
name: topo
description: Route a software subtask to a configured model using Workbench evidence before delegating it. Use for agent selection, Maximize speed, or Minimize cost. Returns recommendations while task classification and native T3 integration remain provisional.
---

# Topo

Recommend a measured model configuration for a software subtask. Keep Workbench
measurements unchanged. This build recommends targets and never dispatches them.

1. As the parent agent, read [the task rubric](references/task-rubric.md) and
   classify each child task. Supply its responsibility, rationale, acceptance
   checks, and measured workload mapping. Do not ask the user to label routine
   tasks. Classify each child independently of its parent. Use `mixed` or
   `unknown` when the brief does not support a measured classification.
2. Use the user's selected objective, **Maximize speed** or **Minimize cost**.
   Read the project's routing policy for its reliability floor, freshness limits,
   allowed provider accounts, comparison, and task revision. Obtain missing policy
   choices from the user instead of inventing defaults.
3. In T3, call `orchestrator_capabilities` for the live catalog. Preserve exact
   IDs and option descriptors. Match configurations through explicit policy bindings,
   including reasoning effort and other advertised options. A catalog entry does
   not establish remaining quota or permission to use another account.
4. Choose the publication input authorized for this decision. When the parent
   requests the latest trusted Workbench publication, prepare the
   [refresh request](references/request.md#refresh-and-pin) and run:

   ```sh
   node <skill-directory>/scripts/topo.mjs --refresh --request /absolute/refresh-request.json
   ```

   This mode fetches only <https://modeltopography.com/published.json>, pins its
   fingerprint, and recommends against that snapshot. It fetches again on the
   next invocation. Stop on a refresh failure. It has no stale fallback.

   For a local snapshot from the user's trusted source, inspect it with:

   ```sh
   node <skill-directory>/scripts/topo.mjs --inspect --dataset /absolute/published.json
   ```

   Pin the accepted fingerprint in the policy. A fingerprint binds a snapshot;
   it does not prove the publisher's identity or make an untrusted source trustworthy.
5. For the local-file path, prepare the request defined in
   [the request reference](references/request.md). Run the packaged selector from
   any directory with Node 22 or newer:

   ```sh
   node <skill-directory>/scripts/topo.mjs --request /absolute/request.json --dataset /absolute/published.json
   ```

6. For `recommended`, report the exact target, selected objective, observed rate,
   confidence bound, evidence snapshot, and prototype limits. For `abstained`,
   report the blocking reasons and leave the target unset. An abstention is a valid
   result. Retain `dataset.canonicalSha256` and any `refresh` metadata with the
   decision. A nonzero exit means invalid input or a failed publication refresh.
   Resolve the failure before retrying.

For one-time setup, request fields, examples, inspection output, and clean-export
preparation, read [the setup reference](references/setup.md). The runnable files
under `examples/` are synthetic. They prove the installed CLI path only.

The selector validates the parent's structured judgment. It compares the same
tier, task revision, comparison, workload size, and unit. Failed attempts remain in elapsed time and cost. It applies the
stopping-adjusted reliability floor before ranking. API-equivalent cost is an
estimate, including for subscription-backed runs.

Refresh reads published measurements, not real-time model discovery. New
measurements remain subject to explicit policy, live catalog, allowed account,
and exact option bindings.

The returned target uses T3's `providerInstanceId`, `model`, and `options` fields.
It is a proposal, not permission to call `delegate_task`. Before any separately
authorized dispatch, preserve explicit user model choices and verify the live
catalog again. The parent still verifies the child's deliverable.

For native settings work, read [the T3 integration contract](references/t3-integration.md).
The native settings, enforced invocation, and live routing qualification are pending.
