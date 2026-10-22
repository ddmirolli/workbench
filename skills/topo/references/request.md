# Topo request reference

The local-file commands perform no network request or model call.
`--inspect --dataset FILE` prints the accepted publication's fingerprint,
comparison groups, and configuration IDs. `--request FILE --dataset FILE` prints
a decision. Each input is a regular file at most 16 MiB.

`--validate --request FILE` checks the request schema before a decision. It reads
only the request file. Its field-level errors omit request values, paths,
credentials, and arbitrary parser text.

`--refresh --request FILE` explicitly fetches the trusted Workbench publication
and pins it for one recommendation. It requires the refresh request below.
All commands remain recommendation-only.

## Refresh and pin

Use this mode when the parent requests the latest trusted publication for a
decision:

```sh
node <skill-directory>/scripts/topo.mjs --refresh --request /absolute/refresh-request.json
```

Start with the local request fields below, then make these changes:

- Set `version` to `topo-refresh-request/1`.
- Set `policy.version` to `topo-refresh-policy/1`.
- Replace `policy.datasetSha256` and `policy.now` with
  `policy.source: "https://modeltopography.com/published.json"`.

Both replaced fields must be absent. Every other task, policy, and live catalog
field stays required. The source must match that URL exactly. The CLI accepts no
alternate URL, and `--refresh` cannot be combined with `--dataset` or `--inspect`.
The separate request versions prevent refresh authorization from entering the
deterministic local-file path.

Each invocation makes one GET with a 15-second deadline, including the response
body. It requests JSON with no credentials, no redirects, and no cache reuse.
It requires HTTP 200, an `application/json` content type, valid UTF-8 JSON, and a
complete publication no larger than 16 MiB. It validates the publication with
the existing parser before computing its canonical fingerprint. Transport,
status, size, encoding, or parse failures exit with code 1 and no decision.
There is no local cache, retry, or stale fallback. A later decision fetches again.

The mode resolves a `topo-request/1` with the fetched fingerprint and the UTC date
at fetch completion, then runs the unchanged selector. Publication and price
freshness limits apply against that date. Valid data outside those limits
produces abstention, with its fingerprint recorded. Other evidence and account
restrictions apply unchanged.

The decision includes `dataset.canonicalSha256` for the exact parsed snapshot,
plus `refresh.source` and `refresh.fetchedAt`, an ISO UTC timestamp. Retain these
fields with the decision receipt. The fingerprint uses the existing canonical
JSON algorithm, so whitespace and object-key order do not change it. It is not a
hash of the HTTP bytes or an independent publisher signature.

This mode refreshes published measurements. It does not discover models in real
time or create bindings for new configurations. A newly measured configuration
is eligible only when explicit policy and live catalog, account, and exact
option bindings also match.

## Request fields

| Field | Value |
| --- | --- |
| `version` | `topo-request/1` |
| `task.version` | `topo-task/1` |
| `task.domain` | `software` or `other` |
| `task.goal` | Nonempty description of the child task |
| `task.acceptanceChecks` | Array of nonempty observable checks |
| `task.responsibility` | A value from the task rubric |
| `task.rationale` | Nonempty explanation grounded in the brief |
| `task.workload` | `null`, or an object with positive integer `rung` and nonempty `unit` |
| `policy.version` | `topo-policy/1` |
| `policy.objective` | `maximize-speed` or `minimize-cost` |
| `policy.allowedProviderInstanceIds` | Nonempty array of unique, authorized account IDs |
| `policy.bindings` | Array of explicit configuration-to-target bindings |
| `policy.datasetSha256` | Canonical fingerprint accepted from a trusted publication |
| `policy.comparisonKey` | Exact measured comparison |
| `policy.taskSetVersion` | Exact measured task revision |
| `policy.minSuccessLower95` | Stopping-adjusted confidence floor, greater than zero and at most one |
| `policy.minAttempts` | Positive integer minimum for the requested rung |
| `policy.now` | Current UTC calendar date, `YYYY-MM-DD`, supplied by the host |
| `policy.maxDatasetAgeDays` | Positive integer freshness limit |
| `policy.maxPriceAgeDays` | Positive integer price freshness limit for Minimize cost |
| `catalog.providers` | Provider array from T3's live capabilities result |

A binding contains `configurationId`, `providerInstanceId`, `model`, and
`options`. It names one measured configuration and one allowed T3 account.
`options` contains exact advertised option IDs and values. Every advertised
option must be explicit. A configuration/account pair has one binding.

The measured reasoning value must match `effort` or `reasoningEffort` in the
target catalog. If advertised, `serviceTier` must match the measured price tier,
and `fastMode` must be false. Other options need recorded values with the same
option ID. An unmeasured option excludes that configuration.

Bindings are operator-supplied compatibility proposals. The catalog does not
establish the execution client's version, model identity, or equivalence to the
benchmark client. A matching ID does not qualify live T3 performance.

## Decision fields

`topo-routing/1` returns `recommended` or `abstained`. Both are successful CLI
executions. Invalid input exits with code 1 and a redacted error message.

`automaticDispatch` is always false. `classification.validation` is always
`provisional`. `selected` is either a candidate or null. `candidates` contains
eligible targets in objective order. `rejected` records each excluded binding's
reasons. `dataset` identifies the snapshot, date, results commit, and fingerprint.

Synthetic publications set `demonstration.synthetic` to `true` in their decision.
That marker applies only to the supplied data. It does not qualify the rubric or a
model configuration.

`observedSecondsPerPass` divides the rung's total elapsed seconds by its complete
passes. `observedUsdPerPass` divides the rung's total API-equivalent dollars by
the same passes. Failed attempts remain in the totals. These observed rates do
not predict independent future retries or the duration of a different task.

Both modes require a positive pass count, enough resolved attempts, matching
measurement counts, positive elapsed time, and the policy's reliability floor.
Minimize cost also requires comparable, nonnegative cost and fresh prices.
Maximize speed can use dated time evidence when price data is stale. A tie uses
the higher confidence bound, then stable configuration and account IDs.

Fixtures, older publication versions, future or stale datasets, fingerprint
changes, missing comparisons, and insufficient evidence produce abstention.
The supplied data must pass the existing Workbench publication parser. This is
schema validation, not independent regrading or signature verification.
