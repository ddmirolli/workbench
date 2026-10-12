import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hostsFor, providerOf } from '../lib/providers.js';
import { findSecrets } from '../lib/scrub.js';
import { runArgs, reasoningArgs, stageJob, describeJob } from '../lib/cli.js';

test('a run opens its own provider\'s API host and nothing else', () => {
  assert.deepEqual(hostsFor('opencode', 'openrouter/moonshotai/kimi-k2'), ['openrouter.ai']);
  assert.deepEqual(hostsFor('mini-swe-agent', 'deepseek/deepseek-chat'), ['api.deepseek.com']);
  assert.deepEqual(hostsFor('gemini-cli', 'gemini-3-pro'), ['generativelanguage.googleapis.com']);
  assert.deepEqual(hostsFor('codex', 'gpt-6.1-sol'), ['api.openai.com']);
  assert.equal(providerOf('grok-build', 'grok-5'), 'xai');
  assert.deepEqual(hostsFor('aider', 'local/qwen', ['llm.example.com']), ['llm.example.com']);
  assert.throws(() => hostsFor('aider', 'local/qwen'), /--allow-host/);
});

test('the Harbor command runs the public dataset with verification off, the full sample, and the provider host', () => {
  const args = runArgs({ agent: 'opencode', model: 'openrouter/poolside/laguna-s-2.1:free', out: '/tmp/jobs' });
  assert.deepEqual(args.slice(0, 13), ['run', '-d', 'model-topography/workbench@1.0', '-a', 'opencode', '-m', 'openrouter/poolside/laguna-s-2.1:free', '-k', '10', '-n', '4', '--disable-verification', '-o']);
  assert.ok(args.includes('NPM_CONFIG_CACHE=/tmp/npm-cache'));
  assert.equal(args[args.indexOf('--allow-agent-host') + 1], 'openrouter.ai');
  assert.deepEqual(reasoningArgs('codex', 'high'), ['--ak', 'config={"model_reasoning_effort":"high"}']);
  assert.deepEqual(reasoningArgs('claude-code', 'max'), ['--ak', 'reasoning_effort=max']);
  assert.throws(() => reasoningArgs('opencode', 'high'), /--ak/);
  assert.throws(() => runArgs({ agent: 'opencode', out: '/tmp/jobs' }), /--model/);
});

test('an upload never carries a key or the home directory', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tw-home-')), job = path.join(home, 'job'), staging = path.join(home, 'staged');
  try {
    fs.mkdirSync(path.join(job, 'trial-a', 'agent'), { recursive: true });
    fs.writeFileSync(path.join(job, 'config.json'), JSON.stringify({ agents: [{ name: 'opencode', model_name: 'openrouter/x/y', kwargs: {} }] }));
    fs.writeFileSync(path.join(job, 'trial-a', 'result.json'), JSON.stringify({ trial_uri: `file://${home}/job/trial-a` }));
    fs.writeFileSync(path.join(job, 'trial-a', 'agent', 'log.txt'), 'all clear');
    assert.deepEqual(stageJob(job, staging, { home }), []);
    assert.match(fs.readFileSync(path.join(staging, 'trial-a', 'result.json'), 'utf8'), /file:\/\/~\/job/);
    assert.deepEqual(describeJob(job), { agent: 'opencode', model: 'openrouter/x/y', kwargs: {}, trials: 1, tasks: ['trial-a'] });
    fs.writeFileSync(path.join(job, 'trial-a', 'agent', 'log.txt'), `export OPENROUTER_API_KEY=sk-or-v1-${'a'.repeat(64)}`);
    assert.deepEqual(stageJob(job, staging, { home }).map(f => f.kind), ['OpenRouter key']);
    fs.writeFileSync(path.join(job, 'trial-a', 'agent', 'log.txt'), 'key=custom-provider-secret-value');
    assert.deepEqual(stageJob(job, staging, { home, secrets: ['custom-provider-secret-value'] }).map(f => f.kind), ['a key from this environment']);
    assert.deepEqual(findSecrets(job, { home: null }).length, 0);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
