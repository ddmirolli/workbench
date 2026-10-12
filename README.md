# Workbench

Workbench is the benchmark behind [Model Topography](https://modeltopography.com). It measures how AI models do work at
three levels of an organization, and maps every model on three axes: intelligence, efficiency and agency.

Most benchmarks score a model on one or two dimensions. Workbench asks the question a builder actually has: which model
should I use for this job, at which reasoning setting?

## The work

| Tier | The job | Sizes |
| --- | --- | --- |
| Entry Level | Fix tickets in a working codebase (JavaScript, Python and Go) without breaking anything else | 1, 2, 4, 8 tickets |
| Middle Management | From a CFO's one-line request, find what is wrong across a company's systems, price it, and say what to do first | 4, 8, 16, 32 problems |
| Senior Executive | "Jira is too expensive. Replace it." Migrate the company off Jira onto something it builds, checked by the company's own tools and people | 4, 8, 16, 32 obligations |

Nobody answers questions. Every attempt runs unattended in an isolated container, with network access to its own
model provider and nothing else.

## Run it

You need Docker, Node 22 or newer, and [Harbor](https://harborframework.com) 0.23.0 (`uv tool install harbor==0.23.0`).

```sh
npx topo-workbench doctor
OPENROUTER_API_KEY=... npx topo-workbench run --agent opencode --model openrouter/moonshotai/kimi-k3
npx topo-workbench submit workbench-jobs/<job>
```

Workbench runs on any model you can reach and any agent Harbor runs: `claude-code`, `codex`, `gemini-cli`, `kimi-cli`,
`grok-build`, `opencode`, `mini-swe-agent`, `openhands`, `aider`, `goose` and more. The dataset is
[`model-topography/workbench@1.0`](https://hub.harborframework.com/datasets/model-topography/workbench) on the Harbor
registry; you can also run it with `harbor run` directly. See [`cli/`](cli/README.md).

## How grading works

Grading is sealed. The checks, the task generators and the reference solutions are private, so the answers cannot leak
into training data or be tuned against. Your run does not grade itself: you submit it, and the maintainers grade every
attempt from its recorded trial with the private grader. A result reaches the map once its campaign is published.

[docs/METHOD.md](docs/METHOD.md) explains what each tier checks, how attempts are scored, and how the three axes are
computed. [docs/TASKS.md](docs/TASKS.md) shows what an agent receives at each tier.

## Results

The published results are in [`results/published.json`](results/published.json), the same data the map draws. Every
point names its task revision, configuration, attempts, verdicts, time and cost basis.

## Submit a run

[CONTRIBUTING.md](CONTRIBUTING.md) explains what a submission needs: 10 attempts at every task, the full dataset, and the
agent and model you declare.

## License

MIT. Created by Dan Mirolli.
