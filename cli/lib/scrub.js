// What must never leave a runner's machine in an upload: API keys and the runner's home directory. The check reads
// every file of a job, text or binary, and names files and kinds, never values. Harbor uploads what this passes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const KEY_PATTERNS = [
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenRouter key', /sk-or-[A-Za-z0-9_-]{20,}/],
  ['OpenAI key', /sk-(?!or-|ant-)(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}/],
  ['Google key', /AIza[0-9A-Za-z_-]{35}/],
  ['xAI key', /xai-[A-Za-z0-9]{40,}/],
  ['Groq key', /gsk_[A-Za-z0-9]{40,}/],
  ['Hugging Face token', /hf_[A-Za-z0-9]{30,}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{36,}/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

function* files(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else if (entry.isFile()) yield file;
  }
}
// Every finding as { file, kind }. `secrets` are values the runner holds (its provider keys), checked verbatim too.
export function findSecrets(directory, { secrets = [], home = os.homedir() } = {}) {
  const findings = [], values = secrets.filter(value => typeof value === 'string' && value.length >= 12);
  for (const file of files(directory)) {
    const text = fs.readFileSync(file).toString('latin1'), relative = path.relative(directory, file);
    for (const [kind, pattern] of KEY_PATTERNS) if (pattern.test(text)) findings.push({ file: relative, kind });
    if (values.some(value => text.includes(value))) findings.push({ file: relative, kind: 'a key from this environment' });
    if (home && home.length > 1 && text.includes(home)) findings.push({ file: relative, kind: 'the home directory' });
  }
  return findings;
}
