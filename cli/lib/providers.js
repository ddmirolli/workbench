// The model provider's API hosts for a run. A run's agent may reach its own provider and nothing else beyond the
// task's allowlist (Dan, 2026-10-11: outsiders run Workbench on any model they can access). Harbor opens each host
// for the agent's run only (`--allow-agent-host`), so the task itself never changes.
//
// A model id names its provider first, as Harbor's agents take it: `openrouter/moonshotai/kimi-k2`,
// `gemini/gemini-3-pro`, `anthropic/claude-sonnet-5-5`. Add a provider by adding a line.
export const PROVIDERS = {
  anthropic: { hosts: ['api.anthropic.com'], key: 'ANTHROPIC_API_KEY' },
  openai: { hosts: ['api.openai.com'], key: 'OPENAI_API_KEY' },
  openrouter: { hosts: ['openrouter.ai'], key: 'OPENROUTER_API_KEY' },
  google: { hosts: ['generativelanguage.googleapis.com'], key: 'GEMINI_API_KEY' },
  gemini: { hosts: ['generativelanguage.googleapis.com'], key: 'GEMINI_API_KEY' },
  moonshot: { hosts: ['api.moonshot.ai'], key: 'MOONSHOT_API_KEY' },
  kimi: { hosts: ['api.moonshot.ai'], key: 'MOONSHOT_API_KEY' },
  deepseek: { hosts: ['api.deepseek.com'], key: 'DEEPSEEK_API_KEY' },
  xai: { hosts: ['api.x.ai'], key: 'XAI_API_KEY' },
  meta: { hosts: ['api.llama.com'], key: 'LLAMA_API_KEY' },
  llama: { hosts: ['api.llama.com'], key: 'LLAMA_API_KEY' },
  together: { hosts: ['api.together.xyz'], key: 'TOGETHER_API_KEY' },
  groq: { hosts: ['api.groq.com'], key: 'GROQ_API_KEY' },
  mistral: { hosts: ['api.mistral.ai'], key: 'MISTRAL_API_KEY' },
  fireworks: { hosts: ['api.fireworks.ai'], key: 'FIREWORKS_API_KEY' },
};
// Agents that sign in to their own service rather than take a provider prefix.
const AGENT_PROVIDER = { 'claude-code': 'anthropic', codex: 'openai', 'gemini-cli': 'google', 'kimi-cli': 'moonshot', 'grok-build': 'xai' };

export function providerOf(agent, model) {
  const prefix = String(model ?? '').split('/')[0].toLowerCase();
  if (PROVIDERS[prefix]) return prefix;
  return AGENT_PROVIDER[agent] ?? null;
}
// The hosts a run opens: its provider's, then any the runner names with --allow-host, each once.
export function hostsFor(agent, model, extra = []) {
  const provider = providerOf(agent, model);
  if (!provider && !extra.length) throw new Error(`No provider is known for model "${model}" with agent "${agent}". Name its API host: --allow-host api.example.com`);
  return [...new Set([...(provider ? PROVIDERS[provider].hosts : []), ...extra])];
}
