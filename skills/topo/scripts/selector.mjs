// Generated from topo/selector.ts by scripts/build-topo.mjs.
import { createHash } from 'node:crypto';
import { parsePublicationDataset } from './publication-schema.mjs';
export const TOPO_VERSION = 'topo-routing/1';
function requireValue(value, message) {
    if (!value)
        throw new Error(message);
}
function object(value) {
    requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), 'Expected an object');
    return value;
}
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const count = (value) => Number.isSafeInteger(value) && Number(value) > 0;
const fraction = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1;
const nonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const strings = (value) => Array.isArray(value) && value.every(text);
const objective = (value) => value === 'maximize-speed' || value === 'minimize-cost';
const day = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const ageDays = (now, date) => (Date.parse(now) - Date.parse(date)) / 86_400_000;
const sorted = (value) => Array.isArray(value) ? value.map(sorted)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
export const publicationFingerprint = (publication) => createHash('sha256').update(JSON.stringify(sorted(publication))).digest('hex');
export function parseTopoRequest(input) {
    const request = object(input), task = object(request.task), policy = object(request.policy), catalog = object(request.catalog);
    requireValue(request.version === 'topo-request/1' && task.version === 'topo-task/1' && policy.version === 'topo-policy/1', 'Unsupported Topo input version');
    requireValue(['software', 'other'].includes(String(task.domain)) && text(task.goal) && text(task.rationale), 'Task needs its domain, goal, and classification rationale');
    requireValue(strings(task.acceptanceChecks), 'Task acceptanceChecks must be an array of nonempty strings');
    requireValue(['bounded-change', 'reconciliation', 'system-ownership', 'mixed', 'unknown'].includes(String(task.responsibility)), 'Unknown task responsibility');
    if (task.workload !== null) {
        const workload = object(task.workload);
        requireValue(count(workload.rung) && text(workload.unit), 'Workload needs a measured rung and unit');
    }
    requireValue(objective(policy.objective), 'Choose maximize-speed or minimize-cost explicitly');
    requireValue(strings(policy.allowedProviderInstanceIds) && policy.allowedProviderInstanceIds.length > 0, 'Explicitly allow at least one provider instance');
    requireValue(new Set(policy.allowedProviderInstanceIds).size === policy.allowedProviderInstanceIds.length, 'Allowed provider instances must be unique');
    requireValue(text(policy.comparisonKey) && text(policy.taskSetVersion), 'Pin the comparison and task-set version');
    requireValue(typeof policy.datasetSha256 === 'string' && /^[0-9a-f]{64}$/.test(policy.datasetSha256), 'Pin the trusted dataset fingerprint');
    requireValue(fraction(policy.minSuccessLower95) && count(policy.minAttempts), 'Set a positive reliability floor and attempt minimum');
    requireValue(day(policy.now) && count(policy.maxDatasetAgeDays) && count(policy.maxPriceAgeDays), 'Set a UTC date and positive freshness limits');
    requireValue(Array.isArray(policy.bindings), 'Policy bindings must be an array');
    const bindingKeys = new Set();
    for (const item of policy.bindings) {
        const binding = object(item);
        requireValue(text(binding.configurationId) && text(binding.providerInstanceId) && text(binding.model), 'A binding needs configuration, provider instance, and model IDs');
        const options = object(binding.options);
        requireValue(Object.entries(options).every(([key, value]) => text(key) && (text(value) || typeof value === 'boolean')), 'Invalid model option');
        const key = JSON.stringify([binding.configurationId, binding.providerInstanceId]);
        requireValue(!bindingKeys.has(key), 'A configuration/provider pair has more than one binding');
        bindingKeys.add(key);
    }
    requireValue(Array.isArray(catalog.providers), 'Catalog providers must be an array');
    const providerIds = new Set();
    for (const item of catalog.providers) {
        const provider = object(item);
        requireValue(text(provider.providerInstanceId) && typeof provider.canRunChildTask === 'boolean' && strings(provider.constraints), 'Invalid provider capability');
        requireValue(!providerIds.has(provider.providerInstanceId), 'Duplicate catalog provider instance');
        providerIds.add(provider.providerInstanceId);
        requireValue(Array.isArray(provider.models), 'Provider models must be an array');
        const modelIds = new Set();
        for (const entry of provider.models) {
            const model = object(entry);
            requireValue(text(model.id) && !modelIds.has(model.id), 'Missing or duplicate catalog model ID');
            modelIds.add(model.id);
            requireValue(model.options === undefined || model.options === null || Array.isArray(model.options), 'Invalid option descriptors');
            const ids = new Set();
            for (const item of (model.options ?? [])) {
                const option = object(item);
                requireValue(text(option.id) && !ids.has(option.id) && ['select', 'boolean'].includes(String(option.type)), 'Missing or duplicate model option descriptor');
                ids.add(option.id);
                if (option.type === 'select') {
                    requireValue(Array.isArray(option.options) && option.options.length > 0, 'Select options need advertised values');
                    const values = option.options.map(item => object(item).id);
                    requireValue(values.every(text) && new Set(values).size === values.length, 'Invalid or duplicate select value');
                }
            }
        }
    }
    return input;
}
const validationField = (message) => {
    if (/domain|goal|classification rationale/i.test(message))
        return 'task';
    if (/acceptanceChecks/i.test(message))
        return 'task.acceptanceChecks';
    if (/responsibility/i.test(message))
        return 'task.responsibility';
    if (/workload/i.test(message))
        return 'task.workload';
    if (/objective|maximize-speed|minimize-cost/i.test(message))
        return 'policy.objective';
    if (/binding|configuration, provider instance, and model IDs|Invalid model option/i.test(message))
        return 'policy.bindings';
    if (/provider instance/i.test(message))
        return 'policy.allowedProviderInstanceIds';
    if (/comparison|task-set/i.test(message))
        return 'policy.comparisonKey';
    if (/fingerprint/i.test(message))
        return 'policy.datasetSha256';
    if (/reliability|attempt minimum/i.test(message))
        return 'policy.minSuccessLower95';
    if (/UTC date|freshness/i.test(message))
        return 'policy.now';
    if (/catalog|provider|model|option/i.test(message))
        return 'catalog.providers';
    return 'request';
};
export function invalidTopoRequest(error) {
    const message = error instanceof Error ? error.message : 'Request does not match the Topo schema';
    return { valid: false, errors: [{ field: validationField(message), message }] };
}
// Validation is local-only. It parses no publication and never calls a model or network service.
export function validateTopoRequest(input) {
    try {
        parseTopoRequest(input);
        return { valid: true, errors: [] };
    }
    catch (error) {
        return invalidTopoRequest(error);
    }
}
export function classifyTopoTask(task) {
    const tiers = { 'bounded-change': 1, reconciliation: 2, 'system-ownership': 3 };
    const tier = task.domain === 'software' && task.acceptanceChecks.length && task.responsibility in tiers
        ? tiers[task.responsibility] : null;
    return { version: 'topo-rubric/1', tier, validation: 'provisional', reason: tier === null
            ? 'Task is outside the rubric, mixes responsibilities, or lacks acceptance checks' : task.rationale };
}
export function resolveTopoSettings(environment, project = {}) {
    for (const settings of [environment, project]) {
        requireValue(settings.router === undefined || settings.router === 'off' || settings.router === 'topo', 'Unknown router');
        requireValue(settings.objective === undefined || settings.objective === null || objective(settings.objective), 'Unknown routing objective');
    }
    requireValue(environment.router !== undefined && environment.objective !== undefined, 'Environment settings must be complete');
    return { router: project.router ?? environment.router, objective: project.objective === undefined ? environment.objective : project.objective };
}
export function recommendTopo(input, publication) {
    const { task, policy, catalog } = parseTopoRequest(input), dataset = parsePublicationDataset(publication);
    const classification = classifyTopoTask(task);
    const result = {
        version: TOPO_VERSION, status: 'abstained', automaticDispatch: false, objective: policy.objective, classification,
        dataset: { version: dataset.version, date: dataset.date, resultsCommit: dataset.resultsCommit,
            canonicalSha256: publicationFingerprint(publication) },
        selected: null, candidates: [], rejected: [], reasons: [],
        limitations: ['Task classification is provisional, not empirically qualified.',
            'Benchmark-client results do not establish T3 child performance or quota availability.',
            'Rates describe observed benchmark work, not a prediction or a guarantee for this task.',
            'Costs are API-equivalent estimates, not subscription charges.'],
        demonstration: dataset.synthetic === true ? { synthetic: true } : null,
    };
    if (dataset.version !== 'mtb-publication/2' || dataset.status !== 'publication-candidate')
        result.reasons.push('A non-fixture mtb-publication/2 dataset is required');
    if (result.dataset.canonicalSha256 !== policy.datasetSha256)
        result.reasons.push('Dataset fingerprint differs from the trusted policy snapshot');
    if (classification.tier === null)
        result.reasons.push(classification.reason);
    if (task.workload === null)
        result.reasons.push('Map the task to a measured workload size and unit before ranking');
    if (!day(dataset.date) || ageDays(policy.now, dataset.date) < 0 || ageDays(policy.now, dataset.date) > policy.maxDatasetAgeDays)
        result.reasons.push('Dataset date is invalid, future-dated, or stale for this policy');
    if (result.reasons.length)
        return result;
    const workload = task.workload;
    for (const binding of policy.bindings) {
        const reasons = [];
        const records = dataset.records.filter(item => item.point.configuration.id === binding.configurationId && item.point.tier === classification.tier
            && item.point.comparisonKey === policy.comparisonKey && item.point.taskSetVersion === policy.taskSetVersion);
        const record = records.length === 1 ? records[0] : undefined;
        const provider = catalog.providers.find(item => item.providerInstanceId === binding.providerInstanceId);
        const model = provider?.models.find(item => item.id === binding.model);
        if (!policy.allowedProviderInstanceIds.includes(binding.providerInstanceId))
            reasons.push('Provider instance is outside the allowlist');
        if (!provider?.canRunChildTask || provider.constraints.length)
            reasons.push('Provider cannot run child tasks');
        if (!model)
            reasons.push('Exact model ID is absent from the live catalog');
        if (records.length > 1)
            reasons.push('More than one record matches the configuration, tier, comparison, and task revision');
        else if (!record)
            reasons.push('No record matches the configuration, tier, comparison, and task revision');
        if (record && model) {
            const config = record.point.configuration;
            if (!config.identity || config.modelId !== binding.model || config.identity.model !== binding.model)
                reasons.push('Model identity does not match the exact measured configuration');
            if (record.executionVerification.status !== 'validated')
                reasons.push('Execution evidence is not validated');
            const options = model.options ?? [];
            const effortKey = ['reasoningEffort', 'effort'].find(key => options.some(option => option.id === key));
            const effort = config.reasoning?.providerValue ?? null;
            if (effort === null || !effortKey || binding.options[effortKey] !== effort)
                reasons.push('Measured reasoning option is missing or different');
            for (const descriptor of options) {
                const value = binding.options[descriptor.id];
                if (value === undefined) {
                    reasons.push(`Model option must be explicit: ${descriptor.id}`);
                    continue;
                }
                if (descriptor.type === 'boolean' ? typeof value !== 'boolean' : !descriptor.options?.some(option => option.id === value))
                    reasons.push(`Unsupported model option: ${descriptor.id}`);
                if (descriptor.id === 'serviceTier' && value !== record.costBreakdown?.prices.serviceTier)
                    reasons.push('Service tier differs from the measured pricing tier');
                else if (descriptor.id === 'fastMode' && value !== false)
                    reasons.push('Fast mode was not measured');
                else if (![effortKey, 'serviceTier', 'fastMode'].includes(descriptor.id) && value !== record.declaration.settings?.[descriptor.id])
                    reasons.push(`No measured value for model option: ${descriptor.id}`);
            }
            if (Object.keys(binding.options).some(key => !options.some(option => option.id === key)))
                reasons.push('Target contains an unadvertised option');
            const rung = record.workload.rungs.find(item => item.rung === workload.rung && item.unit === workload.unit);
            const measure = record.rungMeasures?.find(item => item.rung === workload.rung);
            if (!rung || !measure)
                reasons.push('Exact workload size lacks measurements');
            else {
                if (rung.unresolved !== 0 || rung.passes <= 0 || rung.attempts < policy.minAttempts || rung.attempts !== measure.attempts)
                    reasons.push('Insufficient, unresolved, or mismatched workload attempts');
                if (!nonnegative(rung.stoppingAdjustedLower95) || rung.stoppingAdjustedLower95 < policy.minSuccessLower95)
                    reasons.push('Stopping-adjusted reliability bound is below the policy floor');
                if (!nonnegative(measure.elapsedSeconds) || measure.elapsedSeconds === 0)
                    reasons.push('Elapsed time is unavailable');
                if (policy.objective === 'minimize-cost') {
                    const date = record.costBreakdown?.prices.date;
                    if (!nonnegative(measure.costUsd) || !record.point.costBasis || record.point.costBasis !== dataset.pricing.basis
                        || !day(date) || ageDays(policy.now, date) < 0 || ageDays(policy.now, date) > policy.maxPriceAgeDays)
                        reasons.push('Comparable cost is unavailable or its price basis is stale');
                }
            }
            if (!reasons.length && rung && measure) {
                result.candidates.push({ configurationId: config.id, pointId: record.point.id,
                    target: { providerInstanceId: binding.providerInstanceId, model: binding.model, options: { ...binding.options } },
                    evidenceUrl: record.point.evidenceUrl, attempts: rung.attempts, passes: rung.passes, successLower95: rung.stoppingAdjustedLower95,
                    observedSecondsPerPass: measure.elapsedSeconds / rung.passes,
                    observedUsdPerPass: nonnegative(measure.costUsd) ? measure.costUsd / rung.passes : null,
                    costBasis: record.point.costBasis, priceDate: record.costBreakdown?.prices.date ?? null });
            }
        }
        if (reasons.length)
            result.rejected.push({ configurationId: binding.configurationId, providerInstanceId: binding.providerInstanceId, reasons });
    }
    const metric = (candidate) => policy.objective === 'maximize-speed' ? candidate.observedSecondsPerPass : candidate.observedUsdPerPass;
    result.candidates.sort((a, b) => metric(a) - metric(b) || b.successLower95 - a.successLower95
        || a.configurationId.localeCompare(b.configurationId) || a.target.providerInstanceId.localeCompare(b.target.providerInstanceId));
    result.selected = result.candidates[0] ?? null;
    result.status = result.selected ? 'recommended' : 'abstained';
    if (!result.selected)
        result.reasons.push('No allowed, measured configuration meets this task and policy');
    return result;
}
