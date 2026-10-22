// Generated from topo/refresh.ts by scripts/build-topo.mjs.
import { parsePublicationDataset } from './publication-schema.mjs';
import { invalidTopoRequest, parseTopoRequest, publicationFingerprint, recommendTopo } from './selector.mjs';
export const TRUSTED_PUBLICATION_URL = 'https://modeltopography.com/published.json';
const MAX_PUBLICATION_BYTES = 16 * 1024 * 1024;
const REFRESH_TIMEOUT_MS = 15_000;
function resolveRequest(input, fingerprint, now) {
    if (!input || typeof input !== 'object' || Array.isArray(input))
        throw new Error('Expected a refresh request');
    const request = input;
    if (request.version !== 'topo-refresh-request/1' || request.policy?.version !== 'topo-refresh-policy/1'
        || request.policy.source !== TRUSTED_PUBLICATION_URL || 'datasetSha256' in request.policy || 'now' in request.policy) {
        throw new Error('Explicitly trust the fixed publication source in a refresh policy');
    }
    const { source: _source, ...policy } = request.policy;
    return parseTopoRequest({ ...request, version: 'topo-request/1',
        policy: { ...policy, version: 'topo-policy/1', datasetSha256: fingerprint, now } });
}
// This checks refresh authorization and schema only. It does not fetch a publication.
export function validateTopoRefreshRequest(input) {
    try {
        resolveRequest(input, '0'.repeat(64), '2000-01-01');
        return { valid: true, errors: [] };
    }
    catch (error) {
        return invalidTopoRequest(error);
    }
}
// The transport argument lets tests exercise HTTP on loopback. The CLI always uses fetch.
export async function refreshTopo(input, transport = fetch) {
    resolveRequest(input, '0'.repeat(64), new Date().toISOString().slice(0, 10));
    const controller = new AbortController();
    let reader;
    let timer;
    const deadline = new Promise((_resolve, reject) => {
        timer = setTimeout(() => {
            reject(new Error('Publication refresh timed out'));
            controller.abort();
            void reader?.cancel().catch(() => { });
        }, REFRESH_TIMEOUT_MS);
    });
    const download = async () => {
        const response = await transport(TRUSTED_PUBLICATION_URL, {
            redirect: 'error', credentials: 'omit', cache: 'no-store', signal: controller.signal,
            headers: { Accept: 'application/json', 'Cache-Control': 'no-cache, no-store' },
        });
        if (response.status !== 200 || !response.body)
            throw new Error('Refresh requires a complete HTTP 200 publication');
        if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? ''))
            throw new Error('Refresh requires JSON content');
        const length = response.headers.get('content-length');
        if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_PUBLICATION_BYTES))
            throw new Error('Publication exceeds the byte limit');
        const chunks = [];
        let bytes = 0;
        reader = response.body.getReader();
        while (true) {
            const { done, value: chunk } = await reader.read();
            if (done)
                break;
            bytes += chunk.byteLength;
            if (bytes > MAX_PUBLICATION_BYTES)
                throw new Error('Publication exceeds the byte limit');
            chunks.push(chunk);
        }
        const publication = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
        parsePublicationDataset(publication);
        const fetchedAt = new Date().toISOString();
        const request = resolveRequest(input, publicationFingerprint(publication), fetchedAt.slice(0, 10));
        return { ...recommendTopo(request, publication), refresh: { source: TRUSTED_PUBLICATION_URL, fetchedAt } };
    };
    try {
        return await Promise.race([download(), deadline]);
    }
    finally {
        clearTimeout(timer);
        controller.abort();
        await reader?.cancel().catch(() => { });
    }
}
