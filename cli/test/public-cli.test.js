import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hostsFor } from '../lib/providers.js';
import { REPOSITORY, FULL_SAMPLE, runArgs, stageJob } from '../lib/cli.js';

test('submissions target the planned public repository', () => {
  assert.equal(REPOSITORY, 'ddmirolli/workbench');
});

test('a run uses the public dataset, the full-sample default, and only its provider host', () => {
  const args = runArgs({ agent: 'opencode', model: 'openrouter/example/model', out: '/tmp/workbench-jobs' });
  assert.ok(args.includes('model-topography/workbench@1.0'));
  assert.equal(args[args.indexOf('-k') + 1], String(FULL_SAMPLE));
  assert.ok(args.includes('--disable-verification'));
  assert.equal(args[args.indexOf('--allow-agent-host') + 1], 'openrouter.ai');
  assert.throws(() => hostsFor('aider', 'local/example'), /--allow-host/);
});

test('a staged submission removes synthetic creator identifiers without changing the original job', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'topo-workbench-public-test-'));
  const job = path.join(root, 'job');
  const staging = path.join(root, 'staged');
  const identifier = 'synthetic-participant-123456';
  try {
    fs.mkdirSync(path.join(job, 'trial-a', 'agent'), { recursive: true });
    fs.writeFileSync(path.join(job, 'config.json'), JSON.stringify({ agents: [{ name: 'opencode', model_name: 'openrouter/example/model' }] }));
    fs.writeFileSync(path.join(job, 'trial-a', 'result.json'), '{}');
    const rollout = path.join(job, 'trial-a', 'agent', 'rollout.jsonl');
    const original = JSON.stringify({ payload: { creator_user_id: identifier, creator_account_id: 'synthetic-account-123456' } });
    fs.writeFileSync(rollout, `${original}\n`);

    assert.deepEqual(stageJob(job, staging, { home: root, identifiers: [identifier] }), []);
    const staged = fs.readFileSync(path.join(staging, 'trial-a', 'agent', 'rollout.jsonl'), 'utf8');
    assert.doesNotMatch(staged, new RegExp(identifier));
    assert.match(staged, /\[redacted\]/);
    assert.equal(fs.readFileSync(rollout, 'utf8'), `${original}\n`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
