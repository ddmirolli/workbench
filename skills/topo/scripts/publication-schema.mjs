// Generated from core/publication-schema.ts by scripts/build-topo.mjs.
import { AXIS_NAMES, isComplete } from './topography.mjs';
// This parser runs in a browser. Signature checks and score arithmetic run in the publisher.
function check(value, message = 'Invalid publication data') { if (!value)
    throw new Error(message); }
const assert = {
    ok: check,
    equal: (a, b, message = 'Values must be equal') => check(a === b, message),
    match: (value, pattern) => check(typeof value === 'string' && pattern.test(value)),
};
const sorted = (value) => Array.isArray(value) ? value.map(sorted)
    : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
const stable = (value) => JSON.stringify(sorted(value));
// The future site loader can read this envelope without changing diagnostic parsing.
export function parsePublicationDataset(input) {
    assert.ok(input !== null && typeof input === 'object' && !Array.isArray(input));
    const dataset = input;
    assert.ok(['mtb-publication/1', 'mtb-publication/2'].includes(dataset.version));
    assert.ok(['fixture', 'publication-candidate'].includes(dataset.status));
    assert.match(dataset.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(dataset.resultsCommit, /^[0-9a-f]{40}$/);
    for (const hash of [dataset.sourceHash, dataset.auditHash])
        assert.match(hash, /^[0-9a-f]{64}$/);
    assert.ok(Array.isArray(dataset.points) && Array.isArray(dataset.records));
    assert.match(dataset.pricing.basis, /^mtb-token-cost\/1:[0-9a-f]{64}$/);
    assert.ok(Array.isArray(dataset.pricing.prices) && dataset.pricing.prices.length > 0);
    const pointIds = new Set();
    for (const record of dataset.records) {
        assert.match(record.campaign, /^[0-9a-f]{64}$/);
        const declaration = record.declaration, point = record.point;
        assert.ok(['fixture', 'pending', 'validated'].includes(record.executionVerification.status));
        if (dataset.status !== 'fixture')
            assert.ok(record.executionVerification.status !== 'fixture');
        if (record.executionVerification.status === 'pending')
            assert.equal(point.axes.workload.status, 'unavailable');
        assert.ok(declaration && declaration.model && declaration.client && declaration.clientVersion && declaration.identity);
        assert.match(point.configuration.id, /^[0-9a-f]{64}$/);
        assert.equal(point.configuration.modelId, declaration.model);
        assert.equal(point.configuration.client, declaration.client);
        assert.equal(point.configuration.clientVersion, declaration.clientVersion);
        assert.equal(stable(point.configuration.identity), stable(declaration.identity));
        assert.ok(!pointIds.has(point.id));
        pointIds.add(point.id);
        assert.ok([1, 2, 3].includes(point.tier) && point.comparisonKey && point.evidenceUrl);
        assert.equal(new URL(point.evidenceUrl).protocol, 'https:');
        for (const axis of AXIS_NAMES) {
            const measurement = point.axes[axis];
            if (measurement.status === 'unavailable')
                assert.ok(measurement.reason?.trim());
            else {
                assert.equal(measurement.status, 'validated');
                assert.ok(Number.isFinite(measurement.value) && measurement.value >= 0 && measurement.unit && measurement.methodVersion);
                assert.equal(new URL(measurement.evidenceUrl).protocol, 'https:');
            }
        }
        for (const value of [point.elapsedSeconds, point.costUsd])
            assert.ok(value === null || Number.isFinite(value) && value >= 0);
        assert.equal(stable(point.costDetails), stable(record.costBreakdown));
        if (point.costUsd !== null) {
            const cost = point.costDetails;
            assert.ok(cost && cost.basis === point.costBasis && cost.prices.model === declaration.model);
            assert.equal(cost.basis, dataset.pricing.basis);
            assert.equal(stable(cost.prices), stable(dataset.pricing.prices.find(p => p.model === declaration.model)));
            assert.equal(cost.provenance, 'api-equivalent-token-estimate');
            assert.equal(cost.totalUsd, point.costUsd);
            assert.ok(Math.abs(cost.inputUsd + cost.outputUsd - cost.totalUsd) < 1e-8);
            assert.match(cost.prices.date, /^\d{4}-\d{2}-\d{2}$/);
            assert.equal(new URL(cost.prices.source).protocol, 'https:');
            for (const value of Object.values(cost.prices.rates))
                assert.ok(Number.isFinite(value) && value >= 0);
            for (const value of Object.values(cost.tokens))
                assert.ok(Number.isSafeInteger(value) && value >= 0);
            assert.ok(cost.tokens.cached_input_tokens + cost.tokens.cache_write_input_tokens <= cost.tokens.input_tokens);
            assert.equal(cost.cachedShare, cost.tokens.input_tokens ? cost.tokens.cached_input_tokens / cost.tokens.input_tokens : null);
        }
        else
            assert.equal(point.costDetails, null);
        assert.ok(Number.isSafeInteger(point.attemptCount) && point.attemptCount >= 0);
        assert.ok(Number.isSafeInteger(point.successCount) && point.successCount >= 0 && point.successCount <= point.attemptCount);
        for (const rung of record.workload.rungs) {
            assert.ok(Number.isSafeInteger(rung.failures) && rung.failures >= 0 && rung.passes + rung.failures === rung.attempts);
            assert.equal(rung.rate, rung.attempts ? rung.passes / rung.attempts : null);
            for (const bound of [rung.lower95, rung.interval95?.low ?? null, rung.interval95?.high ?? null, rung.stoppingAdjustedLower95])
                assert.ok(bound === null || Number.isFinite(bound) && bound >= 0 && bound <= 1);
            if (rung.attempts)
                assert.ok(rung.interval95 && rung.lower95 !== null && rung.interval95.low <= rung.rate && rung.rate <= rung.interval95.high);
            else
                assert.equal(rung.interval95, null);
        }
        if (dataset.version === 'mtb-publication/2') {
            assert.match(point.comparisonKey, /^mtb-comparison\/3:/);
            assert.equal(record.efficiencyReference, null);
            assert.equal(stable(point.axes.efficiency), stable(record.rawEfficiencyAxis));
            const raw = record.rawEfficiency;
            const verified = record.verifiedWork;
            const credited = 'credit' in record.workload ? record.workload.credit : null;
            const outputKnown = raw?.completedWork !== null && raw?.completedWork !== undefined;
            assert.ok(!(credited || outputKnown) || verified, 'Known output needs verified-work records');
            if (verified) {
                assert.equal(verified.version, 'mtb-verified-work/1');
                assert.ok(Array.isArray(verified.rungs));
                const sizes = verified.rungs.map(r => r.rung).sort((a, b) => a - b);
                assert.equal(new Set(sizes).size, sizes.length);
                const requiredRungs = credited?.rungs ?? (outputKnown ? record.workload.rungs.filter(r => r.attempts > 0 || r.unresolved > 0) : null);
                if (requiredRungs)
                    assert.equal(stable(sizes), stable(requiredRungs.map(r => r.rung).sort((a, b) => a - b)), 'Verified measurements must cover the applicable workload rungs');
                if (outputKnown)
                    assert.ok(verified.rungs.some(r => r.attempts > 0), 'Known output needs measured eligible attempts');
                for (const rung of verified.rungs) {
                    assert.ok(Number.isSafeInteger(rung.rung) && rung.rung > 0);
                    assert.ok(record.workload.rungs.some(r => r.rung === rung.rung));
                    for (const count of [rung.attempts, rung.held])
                        assert.ok(Number.isSafeInteger(count) && count >= 0);
                    assert.ok(rung.verified === null || Number.isFinite(rung.verified) && rung.verified >= 0 && rung.verified <= rung.attempts);
                    const credit = credited?.rungs.find(r => r.rung === rung.rung);
                    if (credit) {
                        assert.equal(rung.attempts, credit.scored);
                        assert.equal(rung.held, credit.held);
                    }
                    else if (outputKnown) {
                        const measured = record.workload.rungs.find(r => r.rung === rung.rung);
                        assert.equal(rung.attempts + rung.held, measured.attempts + measured.unresolved);
                        assert.ok(rung.held >= measured.unresolved, 'Unresolved results cannot become verified attempts');
                    }
                }
                if (raw?.completedWork !== null && raw?.completedWork !== undefined) {
                    assert.ok(verified.rungs.every(r => r.verified !== null), 'Known output needs every verified measurement');
                    const units = verified.rungs.reduce((sum, r) => sum + r.rung * r.verified, 0);
                    assert.ok(Math.abs(units - raw.completedWork) <= 1e-10 * Math.max(1, units, raw.completedWork), 'Work bars and Efficiency must count the same verified units');
                }
            }
            if (point.axes.efficiency.status === 'validated')
                assert.ok(raw, 'A raw axis needs its rate measurements');
            if (raw) {
                assert.equal(raw.formulaVersion, 'mtb-efficiency-geometric/4');
                assert.equal(raw.elapsedSeconds, point.elapsedSeconds);
                assert.equal(raw.costUsd, point.costUsd);
                assert.equal(raw.costBasis, point.costBasis);
                for (const value of [raw.completedWork, raw.workPerHour, raw.workPerDollar, raw.candidateEfficiency])
                    assert.ok(value === null || Number.isFinite(value) && value >= 0);
                assert.equal(raw.workPerHour, raw.completedWork !== null && raw.elapsedSeconds !== null && raw.elapsedSeconds > 0 ? raw.completedWork / raw.elapsedSeconds * 3600 : null);
                assert.equal(raw.workPerDollar, raw.completedWork !== null && raw.costUsd !== null && raw.costUsd > 0 ? raw.completedWork / raw.costUsd : null);
                assert.equal(raw.candidateEfficiency, raw.workPerHour !== null && raw.workPerDollar !== null ? Math.sqrt(raw.workPerHour) * Math.sqrt(raw.workPerDollar) : null);
                if (point.axes.efficiency.status === 'validated')
                    assert.equal(point.axes.efficiency.value, raw.candidateEfficiency);
            }
        }
        if (point.axes.workload.status === 'validated')
            assert.equal(point.axes.workload.value, record.workload.workShare);
        if (point.axes.intelligence.status === 'validated') {
            assert.ok(record.intelligenceInterval && record.intelligenceMapping);
            assert.ok(record.intelligenceInterval.low <= point.axes.intelligence.value && record.intelligenceInterval.high >= point.axes.intelligence.value);
        }
        assert.equal(point.successCount, record.workload.rungs.reduce((sum, r) => sum + r.passes, 0));
        assert.equal(point.attemptCount, record.workload.rungs.reduce((sum, r) => sum + r.attempts, 0));
    }
    const complete = dataset.records.map(record => record.point).filter(isComplete);
    assert.equal(stable(dataset.points), stable(complete), 'Only complete recorded coordinates become map points');
    return dataset;
}
