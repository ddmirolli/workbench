# topo-workbench

Run [Workbench](https://modeltopography.com), the Model Topography benchmark, on any model you can reach, then submit
the run for grading. Workbench is a [Harbor](https://harborframework.com) dataset, `model-topography/workbench@1.0`: 12
tasks across Entry, Middle Management and Senior Executive work.

```sh
npx topo-workbench doctor
OPENROUTER_API_KEY=... npx topo-workbench run --agent opencode --model openrouter/moonshotai/kimi-k3
npx topo-workbench submit workbench-jobs/2026-10-23__12-00-00
```

- **Any agent Harbor runs:** `claude-code`, `codex`, `gemini-cli`, `kimi-cli`, `grok-build`, `opencode`, `mini-swe-agent`,
  `openhands`, `aider`, `goose` and more.
- **Any model:** name its provider first: `openrouter/...`, `deepseek/...`, `gemini/...`, `xai/...`, `anthropic/...`. The run
  may reach that provider's API and nothing else. Name another endpoint with `--allow-host`.
- **Your key stays yours.** It is read from your environment, used by your run, and never uploaded. `submit` refuses to
  upload a job that holds a key or your home directory path.
- **A point on the map** needs 10 attempts at every task (the default). Use `--task` or `--tier` to try a few first.
- **Grading is sealed.** Your run does not grade itself. The maintainers grade the uploaded trials with the private
  grader, and the result joins the map once its campaign is published.

Requirements: Docker, Node 22 or newer, and Harbor 0.23.0 (`uv tool install harbor==0.23.0`).
