# Task responsibility rubric

`topo-rubric/1` is provisional. Its labels have no empirical qualification yet.
The parent agent classifies the child task and supplies a rationale from the
brief. The selector validates that structured judgment and maps its stated
responsibility to a tier. It does not classify arbitrary prose with keywords or
a model call. Do not ask a user to label routine tasks.

| Responsibility | Tier | Evidence in the supplied task |
| --- | --- | --- |
| `bounded-change` | Entry, 1 | Defined behavior, bounded implementation or repair, independent acceptance checks |
| `reconciliation` | Middle, 2 | Conflicting sources, factual reconciliation, provenance, and actionable records |
| `system-ownership` | Senior, 3 | Scope or architecture decisions and responsibility for an integrated deliverable |
| `mixed` | Abstain | Several responsibilities need separate child tasks |
| `unknown` | Abstain | The task does not support a responsibility label |

Write `rationale` from facts in the brief. Prompt length, file count, the parent's
tier, and a model's reputation do not establish the child's tier. A senior parent
can delegate an entry task.

The middle tier describes reconciliation. It is not a bucket for all medium-sized
coding changes. The current senior benchmark covers prescribed system delivery;
it does not validate all executive judgment. Research, copywriting, computer use,
and other work outside the measured software tasks have no routing coverage here.

Workload size is separate from tier. Set `workload` only when the task maps to an
actual measured rung and its unit, such as one ticket. Keep it `null` when that
mapping is unsupported. The selector does not interpolate between rungs.

Acceptance checks describe observable results. With no checks, an unknown tier,
or no workload mapping, Topo abstains. This behavior keeps missing evidence
visible. It does not validate the parent's classification.

Qualification tests how well agents apply this rubric to separate examples. It
does not turn everyday task labeling into a human responsibility or create a
keyword classifier. Qualification also does not replace the separate requirement
to map each task to an exact measured workload rung and unit.
