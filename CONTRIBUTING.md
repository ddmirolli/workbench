# Submitting a run

1. **Check your machine:** `npx topo-workbench doctor` (Docker, Harbor 0.23.0, Node 22+).
2. **Run the full sample:** `npx topo-workbench run --agent AGENT --model PROVIDER/MODEL [--reasoning LEVEL]`. The
   recommended community sample is 10 attempts at each of the 12 tasks. Your provider key is read from your environment
   and never uploaded. Try a single task first with `--task workbench-management-4 --attempts 1` if you like. A partial
   run can be submitted. A published point needs at least five scored attempts at every size. Partial and top-up
   campaigns can pool only when they use the same task conditions.
3. **Submit:** Add your personal identifiers to an owner-only `~/.config/mtb-export/identifiers` file, one per line.
   Then run `npx topo-workbench submit workbench-jobs/<job>`. It scrubs those values, Codex creator IDs, and your home
   directory from a staged copy. It rejects keys, residual text or binary identifiers, and unsafe symbolic links before
   it uploads the copy to the private Harbor Hub shared with the `model-topography` organization. It then opens a
   prefilled issue here. File the issue.
4. **Grading:** the maintainers download the job and grade every attempt with the private grader. The issue gets the
   result. A published campaign joins the map in the next publication.

What we check before publishing:

- A published point has at least five scored attempts at every size. It reports those counts and pools only campaigns
  that use the same task conditions. Every counted attempt ran the published dataset.
- The model is listed on [models.dev](https://models.dev), so the map can name it.
- A sample of attempts is graded again, and every regrade must agree.
- Anything surprising (say, a higher reasoning level scoring far below a lower one) is investigated before it publishes.

Questions and bug reports are welcome as issues. Pull requests to `cli/` and the docs are welcome too.
