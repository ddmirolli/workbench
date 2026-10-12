// topo-workbench: run Workbench on any model with Harbor, then submit the run for grading. The grader is sealed
// (Dan, 2026-10-11, 2A), so a run here never grades itself: Harbor runs with verification off, and the maintainers
// regrade the uploaded trials with the private grader before a point reaches the map.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { hostsFor, providerOf, PROVIDERS } from './providers.js';
import { findSecrets } from './scrub.js';

export const HARBOR_VERSION = '0.23.0';
export const DATASET = 'model-topography/workbench@1.0';
export const ORG = 'model-topography';
export const REPOSITORY = 'ddmirolli/workbench';
// A point on the map needs 10 attempts at every rung (the full sample, Dan 2026-10-06).
export const FULL_SAMPLE = 10;

const USAGE = `topo-workbench: run Workbench on any model, then submit the run for grading.

  topo-workbench doctor
  topo-workbench run --agent AGENT --model PROVIDER/MODEL [--reasoning LEVEL] [--attempts 10] [--concurrent 4]
                     [--tier entry|management|executive ...] [--task workbench-management-4 ...] [--allow-host HOST ...] [--out DIR] [-- HARBOR_ARGS]
  topo-workbench submit JOB_DIRECTORY [--dry-run]

AGENT is any Harbor agent: claude-code, codex, gemini-cli, kimi-cli, opencode, mini-swe-agent, openhands, aider, goose...
Your own provider key is read from your environment (for example OPENROUTER_API_KEY) and never uploaded.
Docs: https://modeltopography.com/participate`;

const run = (command, args, options = {}) => spawnSync(command, args, { encoding: 'utf8', ...options });

export function harborVersion(harbor = 'harbor') {
  const out = run(harbor, ['--version']);
  return out.status === 0 ? out.stdout.trim().split(/\s+/).pop() : null;
}
export function doctor({ harbor = 'harbor', log = console.log } = {}) {
  const problems = [];
  const docker = run('docker', ['info', '--format', '{{.ServerVersion}}']);
  if (docker.status !== 0) problems.push('Docker is not running. Start Docker Desktop or the Docker daemon.');
  const version = harborVersion(harbor);
  if (!version) problems.push(`Harbor is not installed. Install it: uv tool install harbor==${HARBOR_VERSION}`);
  else if (version !== HARBOR_VERSION) problems.push(`Harbor ${version} is installed; Workbench is measured with ${HARBOR_VERSION}: uv tool install --force harbor==${HARBOR_VERSION}`);
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 22) problems.push(`Node ${process.versions.node}; Workbench needs Node 22 or newer.`);
  for (const problem of problems) log(`- ${problem}`);
  if (!problems.length) log(`Ready: Docker, Harbor ${HARBOR_VERSION}, Node ${process.versions.node}.`);
  return problems;
}

// How each agent takes a reasoning level. Agents not listed take theirs through `-- --ak key=value`.
export function reasoningArgs(agent, level) {
  if (!level) return [];
  if (agent === 'codex') return ['--ak', `config=${JSON.stringify({ model_reasoning_effort: level })}`];
  if (agent === 'claude-code') return ['--ak', `reasoning_effort=${level}`];
  throw new Error(`Pass ${agent}'s reasoning setting to Harbor directly: -- --ak KEY=VALUE`);
}

// The Harbor command for a run. Verification is off: the grader is sealed.
export function runArgs(options) {
  const { agent, model, reasoning, attempts = FULL_SAMPLE, concurrent = 4, tiers = [], tasks = [], allowHosts = [], out, dataset = DATASET, path: local, extra = [] } = options;
  if (!agent) throw new Error('Name the agent: --agent claude-code, codex, opencode, ...');
  if (!model) throw new Error('Name the model: --model PROVIDER/MODEL, such as openrouter/moonshotai/kimi-k2');
  const args = ['run', ...(local ? ['-p', local] : ['-d', dataset]), '-a', agent, '-m', model, '-k', String(attempts), '-n', String(concurrent),
    '--disable-verification', '-o', out,
    // The runtime image's npm cache belongs to root; agents that install with npm need a cache they can write.
    '--ae', 'NPM_CONFIG_CACHE=/tmp/npm-cache'];
  for (const host of hostsFor(agent, model, allowHosts)) args.push('--allow-agent-host', host);
  for (const tier of tiers) args.push('-i', `*workbench-${tier}-*`);
  for (const task of tasks) args.push('-i', `*${task}`);
  args.push(...reasoningArgs(agent, reasoning), ...extra);
  return args;
}

// What a submission says about its run, read from Harbor's own job record.
export function describeJob(job) {
  const config = JSON.parse(fs.readFileSync(path.join(job, 'config.json'), 'utf8'));
  const trials = fs.readdirSync(job, { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(job, e.name, 'result.json'))).map(e => e.name);
  const agent = config.agents?.[0] ?? config.agent ?? {};
  return { agent: agent.name ?? null, model: agent.model_name ?? null, kwargs: agent.kwargs ?? {}, trials: trials.length,
    tasks: [...new Set(trials.map(t => t.split('__')[0]))].sort() };
}

// A scrubbed copy of the job: the home directory becomes "~". Then every file is checked for keys.
export function stageJob(job, staging, { home = os.homedir(), secrets = [] } = {}) {
  fs.rmSync(staging, { recursive: true, force: true });
  fs.cpSync(job, staging, { recursive: true, verbatimSymlinks: true });
  const walk = directory => { for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile()) {
      const bytes = fs.readFileSync(file);
      if (bytes.includes(0)) continue;
      const text = bytes.toString('utf8');
      if (home && text.includes(home)) fs.writeFileSync(file, text.split(home).join('~'));
    }
  } };
  walk(staging);
  // Harbor names an uploaded job by its config's job_name, or by the upload time when there is none, and a download
  // expects that name as the archive's folder: the copy names itself after its folder.
  const config = path.join(staging, 'config.json');
  if (fs.existsSync(config)) { const value = JSON.parse(fs.readFileSync(config, 'utf8')); if (!value.job_name) fs.writeFileSync(config, JSON.stringify({ ...value, job_name: path.basename(staging) }, null, 2)); }
  return findSecrets(staging, { home, secrets });
}

export async function main(argv = process.argv.slice(2), { harbor = 'harbor', log = console.log, env = process.env } = {}) {
  const [command, ...rest] = argv;
  const split = rest.indexOf('--'), own = split < 0 ? rest : rest.slice(0, split), extra = split < 0 ? [] : rest.slice(split + 1);
  if (command === 'doctor') return doctor({ harbor, log }).length ? 1 : 0;
  if (command === 'run') {
    const { values } = parseArgs({ args: own, options: { agent: { type: 'string' }, model: { type: 'string' }, reasoning: { type: 'string' },
      attempts: { type: 'string' }, concurrent: { type: 'string' }, tier: { type: 'string', multiple: true }, task: { type: 'string', multiple: true }, 'allow-host': { type: 'string', multiple: true },
      out: { type: 'string' }, dataset: { type: 'string' }, path: { type: 'string' } } });
    if (doctor({ harbor, log: () => {} }).length) { doctor({ harbor, log }); return 1; }
    const provider = providerOf(values.agent, values.model);
    if (provider && PROVIDERS[provider].key && !env[PROVIDERS[provider].key] && !['claude-code', 'codex'].includes(values.agent))
      log(`Note: ${PROVIDERS[provider].key} is not set; the agent may not reach ${provider}.`);
    const out = path.resolve(values.out ?? 'workbench-jobs');
    const args = runArgs({ agent: values.agent, model: values.model, reasoning: values.reasoning, attempts: Number(values.attempts ?? FULL_SAMPLE),
      concurrent: Number(values.concurrent ?? 4), tiers: values.tier ?? [], tasks: values.task ?? [], allowHosts: values['allow-host'] ?? [], out, dataset: values.dataset, path: values.path, extra });
    log(`harbor ${args.join(' ')}`);
    const result = spawnSync(harbor, args, { stdio: 'inherit', env });
    if (result.status === 0) {
      const job = fs.existsSync(out) ? fs.readdirSync(out).filter(n => fs.existsSync(path.join(out, n, 'config.json'))).sort().at(-1) : null;
      log(`\nDone. A point on the map needs ${FULL_SAMPLE} attempts at every task. Submit it for grading: topo-workbench submit ${job ? path.join(out, job) : out + '/<job>'}`);
    }
    return result.status ?? 1;
  }
  if (command === 'submit') {
    const dryRun = own.includes('--dry-run'), job = own.filter(a => a !== '--dry-run')[0] && path.resolve(own.filter(a => a !== '--dry-run')[0]);
    if (!job || !fs.existsSync(path.join(job, 'config.json'))) { log('Name a Harbor job directory: topo-workbench submit workbench-jobs/2026-10-23__12-00-00'); return 1; }
    const described = describeJob(job);
    const secrets = Object.values(PROVIDERS).map(p => env[p.key]).filter(Boolean);
    // The copy keeps the job's own folder name: Harbor names the uploaded job by it, and a download expects it.
    const staging = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'topo-workbench-')), path.basename(job));
    const findings = stageJob(job, staging, { secrets });
    if (findings.length) {
      log('Not uploaded: the job holds what must stay on this machine.');
      for (const f of findings) log(`- ${f.file}: ${f.kind}`);
      return 1;
    }
    if (dryRun) { log(`Checked ${described.trials} trials (${described.agent}, ${described.model}): nothing that must stay on this machine. Staged at ${staging}.\nWithout --dry-run: harbor upload ${staging} --private --share-org ${ORG} -y, then a prefilled GitHub issue.`); return 0; }
    log(`Uploading ${described.trials} trials (${described.agent}, ${described.model}) to Harbor Hub, shared with ${ORG}...`);
    const upload = spawnSync(harbor, ['upload', staging, '--private', '--share-org', ORG, '-y'], { encoding: 'utf8', env });
    process.stdout.write(upload.stdout ?? ''); process.stderr.write(upload.stderr ?? '');
    if (upload.status !== 0) return upload.status ?? 1;
    const hub = /(https:\/\/\S*hub\.harborframework\.com\S*)/.exec(upload.stdout ?? '')?.[1] ?? '(see the upload output above)';
    const title = `Submission: ${described.model} with ${described.agent}`;
    const body = [`Harbor job: ${hub}`, `Agent: ${described.agent}`, `Model: ${described.model}`, `Agent options: ${JSON.stringify(described.kwargs)}`,
      `Trials: ${described.trials} across ${described.tasks.join(', ')}`, `topo-workbench: ${JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version}`].join('\n');
    const url = `https://github.com/${REPOSITORY}/issues/new?labels=submission&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    log(`\nUploaded. File the submission (opens a prefilled GitHub issue):\n${url}`);
    return 0;
  }
  log(USAGE);
  return command === undefined || command === 'help' || command === '--help' ? 0 : 1;
}
