# Submitting a run

1. **Check your machine:** `npx topo-workbench doctor` (Docker, Harbor 0.23.0, Node 22+).
2. **Run the full sample:** `npx topo-workbench run --agent AGENT --model PROVIDER/MODEL [--reasoning LEVEL]`. That is 10
   attempts at each of the 12 tasks. Your provider key is read from your environment and never uploaded. Try a single
   task first with `--task workbench-management-4 --attempts 1` if you like; a partial run cannot be published.
3. **Submit:** `npx topo-workbench submit workbench-jobs/<job>`. It copies the job, replaces your home directory path
   with `~`, refuses to upload anything that looks like a key, uploads the job to Harbor Hub (private, shared with the
   `model-topography` organization), and opens a prefilled issue here. File the issue.
4. **Grading:** the maintainers download the job and grade every attempt with the private grader. The issue gets the
   result. A published campaign joins the map in the next publication.

What we check before publishing:

- Every task has the same number of attempts, and every attempt ran the published dataset.
- The model is listed on [models.dev](https://models.dev), so the map can name it.
- A sample of attempts is graded again, and every regrade must agree.
- Anything surprising (say, a higher reasoning level scoring far below a lower one) is investigated before it publishes.

Questions and bug reports are welcome as issues. Pull requests to `cli/` and the docs are welcome too.
