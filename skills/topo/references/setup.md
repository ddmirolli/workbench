# Topo setup and examples

This reference prepares a recommendation. It does not authorize a model call.

## Set up a decision

1. Choose `maximize-speed` or `minimize-cost` for this decision.
2. Allow only the provider account IDs that the project permits.
3. Set the reliability floor, minimum attempts, and freshness limits in the policy.
4. Copy exact comparison, task-set, configuration, model, and option IDs from the accepted publication and live catalog.
5. Map the child task to an existing measured rung and unit. Leave `workload` as `null` when no exact mapping exists.

The values in `examples/` are illustrative. They do not approve a sample threshold,
account ID, or policy value.

## Run the offline demonstration

The synthetic example has no network call or model dispatch. It returns a
recommendation marked `demonstration.synthetic: true`.

```sh
node <skill-directory>/scripts/topo.mjs \
  --request <skill-directory>/examples/synthetic-request.json \
  --dataset <skill-directory>/examples/synthetic-publication.json
```

The synthetic example proves only that the installed selector runs. It is not a
Workbench measurement or rubric-qualification result.

## Check a request before a decision

Validate a local or refresh request before reading a publication or using refresh:

```sh
node <skill-directory>/scripts/topo.mjs --validate --request /absolute/request.json
```

`--validate` makes no network request and does not call a model. It reports
field-level schema errors without printing request values, paths, or credentials.
It exits with code 1 when `valid` is `false`.

Use `--inspect --dataset /absolute/published.json` to list each measured workload
rung, unit, attempts, passes, unresolved count, stopping-adjusted lower bound,
and recorded time and cost totals. Inspection reads the local file only.

## Complete request examples

`examples/synthetic-request.json` and `examples/synthetic-publication.json` run
together offline. `examples/refresh-request.example.json` is a complete shape for
the trusted refresh path. Replace every `REPLACE_WITH_...` string with an
authorized, measured value before validation. Refresh is the only Topo command
that reads the trusted publication over the network.

`examples/workload-examples.json` contains accepted, mixed, unknown, and
unsupported structured examples. They show input shape and abstention handling.
They make no empirical claim about rubric qualification.

## Prepare a clean artifact

From an installed Topo folder, create a self-contained artifact:

```sh
node <skill-directory>/scripts/export.mjs --out /absolute/topo-export --dataset /absolute/published.json
node <skill-directory>/scripts/export.mjs --verify /absolute/topo-export/topo
```

The exporter copies only the Topo package, its license, references, examples, and
generated scripts. With a publication input, it writes `evidence-manifest.json`.
That manifest preserves the source publication fingerprint, results commit, source
hash, and audit hash. It derives the planned public Workbench evidence destinations
from the established clean-export mapping.

The URLs become valid only after the authorized public release. The exporter does
not change repository visibility or prove anonymous access. Verify the published
artifact and each URL after release.
