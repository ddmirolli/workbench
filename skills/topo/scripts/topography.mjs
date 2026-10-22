// Generated from core/topography.ts by scripts/build-topo.mjs.
// Axes have names, not letters. A chart decides which name it draws on which
// letter. A routing client reads the names and never sees a letter.
export const AXIS_NAMES = ['workload', 'efficiency', 'intelligence'];
export const isComplete = (point) => AXIS_NAMES.every(name => { const axis = point.axes[name]; return axis?.status === 'validated' && Number.isFinite(axis.value) && axis.value >= 0; });
// Missing coordinates are omitted, never positioned at zero. Input authenticity
// and schema validation belong to the publishing service, not the renderer.
export function visiblePoints(state) {
    const selected = new Set(state.selectedConfigurationIds);
    return state.points.filter(point => point.tier === state.tier && point.comparisonKey === state.comparisonKey
        && selected.has(point.configuration.id) && isComplete(point));
}
