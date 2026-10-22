# Method

Workbench measures how models perform work at three organizational levels. Model Topography maps those measurements on
three axes. There is no combined score: which model suits a job depends on the work, the evidence and the conditions
it was tested under.

A **configuration** is a model with its agent, reasoning setting, tools and limits. The recommended community full
sample runs 10 attempts at each task, unattended, in an isolated container that can reach its own model provider and
nothing else. A published point reports its actual attempt counts. It needs at least five scored attempts at every size.
Partial and top-up campaigns can pool only when they use the same task conditions.

## The three tiers

**Entry Level.** A ticket in a working codebase (JavaScript, Python and Go). The model must understand the existing
behavior, catch what the ticket leaves unsaid, and make a focused repair without breaking anything else. Behavioral
tests check the fix and regressions. Larger sizes combine more tickets into one assignment: 1, 2, 4 and 8.

**Middle Management.** A one-line request from the CFO: revenue in the board deck doesn't match finance, and some
customers seem to be charged wrongly. The model investigates the company's systems without changing them, finds each
distinct problem, names every affected record, prices it, and recommends what to do first. Checks compare each finding
with the planted facts. Sizes are the number of problems: 4, 8, 16 and 32.

**Senior Executive.** "Jira is too expensive. Replace it." The model migrates the company off Jira onto a system it
builds and runs. The company's own tools and people check it: its integrations, the daily workflows of the people who
use it, its access rules, and whether it survives a restart. Sizes are the number of obligations: 4, 8, 16 and 32. A separate quality score (accessibility, layout, speed) rides along and never
enters Agency.

## How an attempt is scored

- The private grader checks the attempt's final workspace. Each check is a unit of work; an attempt earns the share of
  units it delivered.
- Transcript rules apply on top: claiming completion with work unfinished halves the credit; harmful actions score zero;
  procedure failures are flagged.
- An attempt the harness ended (an infrastructure failure, a provider error) counts neither way and is re-run.
- An attempt passes only when every check passes and no rule fails.

## The three axes

**Intelligence:** `I = ECI(model)`, the [Epoch Capabilities Index](https://epoch.ai/data/eci_scores.csv). It is the same
for a model at every tier.

**Agency:** `A = 100 × credited work / offered work`, the share of the tier's work the configuration delivered
unattended, over every scored attempt. A point needs at least five scored attempts at every size.

**Efficiency:** `E = √(verified work units per hour × verified work units per dollar)`. Verified work counts the units
delivered before the completion penalty and excludes harmful output. The geometric mean gives speed and cost equal
proportional weight. Costs are API-equivalent token estimates at the provider's published prices, including cache
reads and writes, whatever the run actually paid. Price ranges across models are far wider than speed ranges, so
Efficiency mostly reflects cost.

More reasoning earns nothing by itself. It has to pay for its own time and cost in finished work, so a model's scores
can rise and then fall as its reasoning setting climbs.

## Reading the map

Height is Intelligence. The floor is Agency against Efficiency. The sheet passes through every plotted point and says
nothing about an untested model or setting. The **best pick** is, of the models shown that finish reliably (Agency 70
or more), the one closest to the top on all three axes.

## Before anything publishes

- Every attempt is graded from its own recorded trial. A sample of attempts is graded again, and every regrade must agree.
- A surprising result, such as a higher reasoning level scoring far below a lower one, is investigated and reviewed
  before it publishes.
- If the grader is fixed after a run, every attempt of the affected task set is graded again under the fixed grader,
  and the earlier verdicts stay on record.
