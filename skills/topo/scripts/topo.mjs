// Generated from topo/cli.ts by scripts/build-topo.mjs.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { publicationFingerprint, recommendTopo, validateTopoRequest } from './selector.mjs';
import { parsePublicationDataset } from './publication-schema.mjs';
import { refreshTopo, validateTopoRefreshRequest } from './refresh.mjs';
const help = 'Usage: node topo.mjs --request REQUEST.json --dataset published.json\n       node topo.mjs --inspect --dataset published.json\n       node topo.mjs --validate --request REQUEST.json\n       node topo.mjs --refresh --request REFRESH-REQUEST.json\nPrint a recommend-only Topo decision or dataset metadata. --validate and local-file commands make no network request or model call. Only --refresh fetches https://modeltopography.com/published.json. No model dispatch.';
function readJson(file) {
    const fd = fs.openSync(file, 'r');
    try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile() || stat.size > 16 * 1024 * 1024)
            throw new Error('Inputs must be regular JSON files no larger than 16 MiB');
        return JSON.parse(fs.readFileSync(fd, 'utf8'));
    }
    finally {
        fs.closeSync(fd);
    }
}
export function topoMain(args) {
    if (args.length === 1 && args[0] === '--help') {
        console.log(help);
        return;
    }
    if (args.length === 3 && args[0] === '--refresh' && args[1] === '--request' && args[2]) {
        return refreshTopo(readJson(args[2])).then(result => { console.log(JSON.stringify(result, null, 2)); });
    }
    if (args.length === 3 && args[0] === '--inspect' && args[1] === '--dataset' && args[2]) {
        const publication = readJson(args[2]), dataset = parsePublicationDataset(publication);
        console.log(JSON.stringify({ version: dataset.version, date: dataset.date, canonicalSha256: publicationFingerprint(publication),
            comparisons: [...new Set(dataset.records.map(record => JSON.stringify({ tier: record.point.tier, comparisonKey: record.point.comparisonKey, taskSetVersion: record.point.taskSetVersion })))].map(item => JSON.parse(item)),
            configurations: dataset.records.map(record => ({ id: record.point.configuration.id, tier: record.point.tier,
                model: record.point.configuration.modelId, client: record.point.configuration.client,
                clientVersion: record.point.configuration.clientVersion, effort: record.point.configuration.reasoning?.providerValue ?? null,
                workloads: record.workload.rungs.map(rung => ({ rung: rung.rung, unit: rung.unit, attempts: rung.attempts,
                    passes: rung.passes, failures: rung.failures, unresolved: rung.unresolved,
                    stoppingAdjustedLower95: rung.stoppingAdjustedLower95 })),
                measures: (record.rungMeasures ?? []).map(measure => ({ rung: measure.rung, attempts: measure.attempts,
                    elapsedSeconds: measure.elapsedSeconds, costUsd: measure.costUsd })) })) }, null, 2));
        return;
    }
    if (args.length === 3 && args[0] === '--validate' && args[1] === '--request' && args[2]) {
        const request = readJson(args[2]);
        const validation = request && typeof request === 'object' && !Array.isArray(request)
            && request.version === 'topo-refresh-request/1'
            ? validateTopoRefreshRequest(request) : validateTopoRequest(request);
        console.log(JSON.stringify(validation, null, 2));
        if (!validation.valid)
            process.exitCode = 1;
        return;
    }
    const options = new Map();
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i], value = args[i + 1];
        if (!key || !['--request', '--dataset'].includes(key) || !value || options.has(key))
            throw new Error(help);
        options.set(key, value);
    }
    const request = options.get('--request'), dataset = options.get('--dataset');
    if (!request || !dataset)
        throw new Error(help);
    console.log(JSON.stringify(recommendTopo(readJson(request), readJson(dataset)), null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
    try {
        await topoMain(process.argv.slice(2));
    }
    catch {
        console.error(process.argv[2] === '--refresh'
            ? 'Topo refresh failed. Check the refresh request, trusted publication, and network connection.'
            : 'Invalid Topo input. Use --help and check the request, catalog, and publication schemas.');
        process.exitCode = 1;
    }
}
