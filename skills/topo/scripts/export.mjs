// Generated from topo/export.ts by scripts/build-topo.mjs.
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parsePublicationDataset } from './publication-schema.mjs';
import { publicationFingerprint } from './selector.mjs';
const PRIVATE_REPOSITORY = ['https://github.com', 'ddmirolli', 'model-topography'].join('/');
const PUBLIC_REPOSITORY = 'https://github.com/ddmirolli/workbench';
const campaignUrl = new RegExp(`^${PRIVATE_REPOSITORY.replaceAll('.', '\\.')}/tree/([0-9a-f]{40})/harbor(?:/([0-9a-f]{64}))?$`);
const SEALED_NAMES = new Set(['tasks', 'harbor', 'core', 'grading', 'release']);
const PACKAGE_FILES = [
    'LICENSE', 'SKILL.md', 'agents/openai.yaml',
    'examples/refresh-request.example.json', 'examples/synthetic-publication.json', 'examples/synthetic-request.json', 'examples/workload-examples.json',
    'references/request.md', 'references/setup.md', 'references/t3-integration.md', 'references/task-rubric.md',
    'scripts/export.mjs', 'scripts/publication-schema.mjs', 'scripts/refresh.mjs', 'scripts/selector.mjs', 'scripts/topo.mjs', 'scripts/topography.mjs',
].sort();
const sha256 = (input) => createHash('sha256').update(input).digest('hex');
const packageRoot = () => path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function relativeFiles(directory) {
    const files = [];
    const visit = (current) => {
        for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
            const absolute = path.join(current, entry.name);
            if (entry.isDirectory())
                visit(absolute);
            else if (entry.isFile())
                files.push(path.relative(directory, absolute).split(path.sep).join('/'));
        }
    };
    visit(directory);
    return files.sort();
}
function mapEvidenceUrl(value, dataset, campaigns) {
    const campaign = campaignUrl.exec(value);
    if (campaign) {
        if (campaign[1] !== dataset.resultsCommit)
            throw new Error('Evidence results commit does not match the publication');
        if (campaign[2] && !campaigns.has(campaign[2]))
            throw new Error('Evidence campaign does not exist in the publication');
        const base = `${PUBLIC_REPOSITORY}/blob/main/evidence/${campaign[1].slice(0, 12)}`;
        return campaign[2]
            ? { kind: 'campaign', resultsCommit: campaign[1], campaign: campaign[2], publicUrl: `${base}/${campaign[2].slice(0, 12)}.json` }
            : { kind: 'results-index', resultsCommit: campaign[1], publicUrl: `${base}/README.md` };
    }
    if (value === `${PRIVATE_REPOSITORY}/blob/main/tasks/seeded/task-set.json`)
        return { kind: 'task-doc', publicUrl: `${PUBLIC_REPOSITORY}/blob/main/docs/TASKS.md` };
    if (value === `${PRIVATE_REPOSITORY}/blob/main/release/decisions.tsv`)
        return { kind: 'method-doc', publicUrl: `${PUBLIC_REPOSITORY}/blob/main/docs/METHOD.md` };
    return null;
}
function visitStrings(value, visit) {
    if (typeof value === 'string')
        visit(value);
    else if (Array.isArray(value))
        value.forEach(item => visitStrings(item, visit));
    else if (value && typeof value === 'object')
        Object.values(value).forEach(item => visitStrings(item, visit));
}
export function buildEvidenceManifest(publication) {
    const dataset = parsePublicationDataset(publication), campaigns = new Set(dataset.records.map(record => record.campaign));
    const references = new Map();
    visitStrings(publication, value => {
        const reference = mapEvidenceUrl(value, dataset, campaigns);
        if (reference)
            references.set(reference.publicUrl, reference);
    });
    return { version: 'topo-evidence-manifest/1',
        sourcePublication: { canonicalSha256: publicationFingerprint(publication), resultsCommit: dataset.resultsCommit,
            sourceHash: dataset.sourceHash, auditHash: dataset.auditHash },
        publicRepository: PUBLIC_REPOSITORY, references: [...references.values()].sort((a, b) => a.publicUrl.localeCompare(b.publicUrl)) };
}
function exportManifest(directory) {
    return { version: 'topo-export/1', files: relativeFiles(directory).filter(file => file !== 'MANIFEST.json')
            .map(file => ({ path: file, sha256: sha256(fs.readFileSync(path.join(directory, file))) })) };
}
function copyPackage(source, destination) {
    const sourceFiles = relativeFiles(source);
    if (JSON.stringify(sourceFiles) !== JSON.stringify(PACKAGE_FILES))
        throw new Error('Source skill contains files outside the export allowlist');
    for (const file of PACKAGE_FILES) {
        const target = path.join(destination, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(source, file), target);
    }
}
function unsafeArtifactText(value) {
    return /github\.com\/ddmirolli\/model-topography|\/Users\/|op:\/\/|BEGIN [A-Z ]*PRIVATE KEY|sk-(?:proj-)?[A-Za-z0-9_-]{20}|ghp_[A-Za-z0-9]{30}/.test(value);
}
export function verifyTopoExport(artifact) {
    const directory = path.resolve(artifact), manifestPath = path.join(directory, 'MANIFEST.json');
    if (!fs.statSync(directory).isDirectory())
        throw new Error('Export artifact must be a directory');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.version !== 'topo-export/1' || !Array.isArray(manifest.files))
        throw new Error('Export manifest is invalid');
    for (const required of ['LICENSE', 'SKILL.md', 'agents/openai.yaml', 'examples/synthetic-request.json', 'examples/synthetic-publication.json', 'scripts/topo.mjs']) {
        if (!manifest.files.some(file => file.path === required))
            throw new Error('Export artifact is incomplete');
    }
    const actual = exportManifest(directory);
    if (JSON.stringify(actual) !== JSON.stringify(manifest))
        throw new Error('Export artifact does not match its manifest');
    for (const file of relativeFiles(directory)) {
        const parts = file.split('/');
        if (parts.some(part => SEALED_NAMES.has(part) || part === '.env' || part.startsWith('.env.')))
            throw new Error('Export artifact contains a sealed path');
        if (unsafeArtifactText(fs.readFileSync(path.join(directory, file), 'utf8')))
            throw new Error('Export artifact contains private text');
    }
    const evidencePath = path.join(directory, 'evidence-manifest.json');
    const evidence = fs.existsSync(evidencePath) ? JSON.parse(fs.readFileSync(evidencePath, 'utf8')) : null;
    if (evidence) {
        if (evidence.version !== 'topo-evidence-manifest/1' || evidence.publicRepository !== PUBLIC_REPOSITORY
            || !/^[0-9a-f]{64}$/.test(evidence.sourcePublication?.canonicalSha256 ?? '')
            || !/^[0-9a-f]{40}$/.test(evidence.sourcePublication?.resultsCommit ?? '')
            || !evidence.references.every(reference => reference.publicUrl.startsWith(`${PUBLIC_REPOSITORY}/blob/main/`)))
            throw new Error('Evidence manifest is invalid');
    }
    const smoke = spawnSync(process.execPath, ['scripts/topo.mjs', '--request', 'examples/synthetic-request.json', '--dataset', 'examples/synthetic-publication.json'], { cwd: directory, encoding: 'utf8' });
    if (smoke.status !== 0)
        throw new Error('Export artifact smoke test failed');
    const decision = JSON.parse(smoke.stdout);
    if (decision.status !== 'recommended' || decision.demonstration?.synthetic !== true)
        throw new Error('Export artifact synthetic example is invalid');
    return { files: manifest.files.length, evidenceReferences: evidence?.references.length ?? 0 };
}
export function exportTopo(out, datasetPath) {
    const source = packageRoot(), destination = path.resolve(out), artifact = path.join(destination, 'topo');
    if (destination === source || source.startsWith(`${destination}${path.sep}`) || destination.startsWith(`${source}${path.sep}`)) {
        throw new Error('Export destination must be outside the source skill');
    }
    if (fs.existsSync(destination)) {
        if (!fs.statSync(destination).isDirectory() || fs.readdirSync(destination).length)
            throw new Error('Export destination must be a new or empty directory');
    }
    else
        fs.mkdirSync(destination, { recursive: true });
    copyPackage(source, artifact);
    if (datasetPath) {
        const publication = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
        fs.writeFileSync(path.join(artifact, 'evidence-manifest.json'), `${JSON.stringify(buildEvidenceManifest(publication), null, 2)}\n`);
    }
    fs.writeFileSync(path.join(artifact, 'MANIFEST.json'), `${JSON.stringify(exportManifest(artifact), null, 2)}\n`);
    const verified = verifyTopoExport(artifact);
    return { artifact, ...verified };
}
function main(args) {
    if ((args.length === 2 || args.length === 4) && args[0] === '--out' && args[1] && (args.length === 2 || args[2] === '--dataset') && (args.length === 2 || args[3])) {
        console.log(JSON.stringify(exportTopo(args[1], args[3]), null, 2));
        return;
    }
    if (args.length === 2 && args[0] === '--verify' && args[1]) {
        console.log(JSON.stringify(verifyTopoExport(args[1]), null, 2));
        return;
    }
    throw new Error('Usage: node export.mjs --out /absolute/output [--dataset /absolute/published.json]\n       node export.mjs --verify /absolute/output/topo');
}
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
    try {
        main(process.argv.slice(2));
    }
    catch {
        console.error('Topo export failed. Check the output directory and publication input.');
        process.exitCode = 1;
    }
}
