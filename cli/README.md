# topo-workbench

Run [Workbench](https://modeltopography.com), the Model Topography benchmark, on any model you can reach, then submit
the run for grading. Workbench is a [Harbor](https://harborframework.com) dataset, `model-topography/workbench@1.0`: 12
tasks across Entry, Middle Management and Senior Executive work.

After release, install this exact version:

```sh
npm install --global topo-workbench@1.0.0-rc.1
topo-workbench doctor
OPENROUTER_API_KEY=... topo-workbench run --agent opencode --model openrouter/moonshotai/kimi-k3
topo-workbench submit workbench-jobs/2026-10-23__12-00-00
```

- **Any agent Harbor runs:** `claude-code`, `codex`, `gemini-cli`, `kimi-cli`, `grok-build`, `opencode`, `mini-swe-agent`,
  `openhands`, `aider`, `goose` and more.
- **Any model:** name its provider first: `openrouter/...`, `deepseek/...`, `gemini/...`, `xai/...`, `anthropic/...`. The run
  may reach that provider's API and nothing else. Name another endpoint with `--allow-host`.
- **Your key stays yours.** It is read from your environment, used by your run, and never uploaded. `submit` refuses to
  upload a job that holds a key or a residual personal identifier. Before submitting, create an owner-only
  `~/.config/mtb-export/identifiers` file with one personal identifier per line. `submit` scrubs that list, Codex
  creator IDs, and your home directory from a staged copy. It rejects residual text, binary identifiers, and unsafe
  symbolic links. Use `--identifiers FILE` to use another owner-only file.
- **Community full sample.** The default is 10 attempts at each task. Use `--task` or `--tier` to try a few first.
- **Published point eligibility.** A point needs at least five scored attempts at every size. It reports its actual
  attempt counts. Partial and top-up campaigns can pool when they use the same task conditions.
- **Grading is sealed.** Your run does not grade itself. The maintainers grade the uploaded trials with the private
  grader, and the result joins the map once its campaign is published.

Requirements: Docker, Node 22 or newer, and Harbor 0.23.0 (`uv tool install harbor==0.23.0`).
