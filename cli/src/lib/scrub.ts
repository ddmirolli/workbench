// What must never leave a runner's machine in an upload: keys, creator IDs, listed personal identifiers, and the
// runner's home directory. The check reads every file of a job, text or binary, and names files and kinds, never
// values. The caller uploads only a staged copy that passes these checks.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A finding names a file and a kind of data, never the value.
export interface Finding {
  file: string;
  kind: string;
}

export const KEY_PATTERNS: readonly (readonly [kind: string, pattern: RegExp])[] = [
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

export const REDACTED = '[redacted]';
export const DEFAULT_IDENTIFIERS = path.join(os.homedir(), '.config/mtb-export/identifiers');
const CREATOR = /"(creator_user_id|creator_account_id)"\s*:\s*("(?:[^"\\]|\\.)*"|null|true|false|-?[0-9][0-9.eE+-]*)/g;
const CREATOR_ESCAPED_START = /(\\+)"(creator_user_id|creator_account_id)\1"\s*:\s*(?:(\1")|(null|true|false|-?[0-9][0-9.eE+-]*))/g;
const keptCreatorValue = (value: string): boolean => value === `"${REDACTED}"` || value === 'null' || /^(\\+)"\[redacted\]\1"$/.test(value);

interface EscapedCreator {
  start: number;
  end: number;
  key: string;
  value: string;
  escapes: string;
}

function escapedCreators(text: string): EscapedCreator[] {
  const matches: EscapedCreator[] = [], start = new RegExp(CREATOR_ESCAPED_START);
  for (let match: RegExpExecArray | null; (match = start.exec(text));) {
    const [source, escapes = '', key = '', , bare] = match;
    if (bare) { matches.push({ start: match.index, end: match.index + source.length, key, value: bare, escapes }); continue; }
    const depth = escapes.length, closeStride = 2 * (depth + 1), contentStart = start.lastIndex;
    let end = -1;
    for (let quote = text.indexOf('"', contentStart); quote >= 0; quote = text.indexOf('"', quote + 1)) {
      let slashCount = 0;
      while (text[quote - slashCount - 1] === '\\') slashCount += 1;
      if (slashCount >= depth && (slashCount - depth) % closeStride === 0) { end = quote + 1; break; }
    }
    if (end >= 0) matches.push({ start: match.index, end, key, value: text.slice(contentStart - depth - 1, end), escapes });
  }
  return matches;
}

export function readIdentifiers(file: string = DEFAULT_IDENTIFIERS): string[] {
  if (!fs.existsSync(file)) throw new Error(`No identifiers file at ${file}. List personal identifiers there, one per line, before submitting a run.`);
  if ((fs.statSync(file).mode & 0o077) !== 0) throw new Error(`${file} must be readable by its owner only (chmod 600).`);
  const values = fs.readFileSync(file, 'utf8').split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
  if (!values.length) throw new Error(`${file} lists no identifiers.`);
  if (values.some(value => value.length < 6)) throw new Error(`${file}: every identifier must be at least 6 characters.`);
  return values;
}

interface Walked {
  files: string[];
  links: string[];
  paths: string[];
}

function walk(directory: string, links: string[] = [], paths: string[] = []): Walked {
  const files = fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry): string[] => {
    const file = path.join(directory, entry.name);
    paths.push(file);
    if (entry.isSymbolicLink()) { links.push(file); return []; }
    if (entry.isDirectory()) return walk(file, links, paths).files;
    return entry.isFile() ? [file] : [];
  });
  return { files, links, paths };
}

const isText = (bytes: Buffer): boolean => !bytes.includes(0);
const replaceAll = (text: string, value: string, by: string): string => text.split(value).join(by);

export interface ScrubOptions {
  identifiers?: readonly string[];
  home?: string;
}

export function scrubPersonalData(text: string, { identifiers = [], home = os.homedir() }: ScrubOptions = {}): string {
  let clean = text.replace(CREATOR, (_, key) => `"${key}":"${REDACTED}"`);
  for (const match of escapedCreators(clean).reverse()) clean = `${clean.slice(0, match.start)}${match.escapes}"${match.key}${match.escapes}":${match.escapes}"${REDACTED}${match.escapes}"${clean.slice(match.end)}`;
  for (const identifier of identifiers) clean = replaceAll(clean, identifier, REDACTED);
  return home && home.length > 1 ? replaceAll(clean, home, '~') : clean;
}

// Every finding names a file and a kind. `secrets` are provider-key values held by the runner.
export function findSecrets(directory: string, { secrets = [], stagingName = '' }: { secrets?: readonly string[]; stagingName?: string } = {}): Finding[] {
  const findings: Finding[] = [], values = secrets.filter(value => typeof value === 'string' && value.length >= 12), walked = walk(directory);
  const scanName = (name: string, file: string): void => {
    for (const [kind, pattern] of KEY_PATTERNS) if (pattern.test(name)) findings.push({ file, kind: `${kind} in path` });
    if (values.some(value => name.includes(value))) findings.push({ file, kind: 'a key from this environment in path' });
  };
  for (const item of walked.paths) scanName(path.relative(directory, item), path.relative(directory, item));
  if (stagingName) scanName(stagingName, 'staged job name');
  for (const file of walked.files) {
    const text = fs.readFileSync(file).toString('latin1'), relative = path.relative(directory, file);
    for (const [kind, pattern] of KEY_PATTERNS) if (pattern.test(text)) findings.push({ file: relative, kind });
    if (values.some(value => text.includes(value))) findings.push({ file: relative, kind: 'a key from this environment' });
  }
  return findings;
}

export function findPersonalData(directory: string, { identifiers = [], home = os.homedir(), stagingName = '' }: ScrubOptions & { stagingName?: string } = {}): Finding[] {
  const findings: Finding[] = [], values = identifiers.filter(value => typeof value === 'string' && value.length >= 6), { files, links, paths } = walk(directory);
  const scan = (bytes: Buffer, file: string): void => {
    values.forEach((value, index) => { if (bytes.includes(Buffer.from(value))) findings.push({ file, kind: `identifier ${index + 1}` }); });
    if (home && home.length > 1 && bytes.includes(Buffer.from(home))) findings.push({ file, kind: 'the home directory' });
  };
  for (const item of paths) {
    const relative = path.relative(directory, item);
    scan(Buffer.from(relative), relative);
  }
  if (stagingName) scan(Buffer.from(stagingName), 'staged job name');
  for (const file of files) {
    const bytes = fs.readFileSync(file), relative = path.relative(directory, file);
    scan(bytes, relative);
    if (!isText(bytes)) continue;
    const text = bytes.toString('utf8');
    for (const match of text.matchAll(CREATOR)) if (!keptCreatorValue(match[2] ?? '')) findings.push({ file: relative, kind: `unredacted ${match[1] ?? ''}` });
    for (const match of escapedCreators(text)) if (!keptCreatorValue(match.value)) findings.push({ file: relative, kind: `unredacted ${match.key}` });
  }
  for (const link of links) {
    const target = fs.readlinkSync(link), relative = `${path.relative(directory, link)} (link)`;
    scan(Buffer.from(target), relative);
    if (path.isAbsolute(target) || path.relative(directory, path.resolve(path.dirname(link), target)).split(path.sep)[0] === '..') {
      findings.push({ file: relative, kind: 'unsafe symbolic link' });
    }
  }
  return findings;
}
