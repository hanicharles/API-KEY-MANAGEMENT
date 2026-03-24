export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    label: 'Claude / Anthropic',
    color: '#D97757',
    bg: '#2a1a14',
    icon: '🤖',
    placeholder: 'sk-ant-api03-...',
    docsUrl: 'https://console.anthropic.com/settings/keys'
  },
  openai: {
    name: 'OpenAI',
    label: 'OpenAI / GPT',
    color: '#19C37D',
    bg: '#0d2119',
    icon: '⚡',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys'
  },
  gemini: {
    name: 'Gemini',
    label: 'Google Gemini',
    color: '#4285F4',
    bg: '#0d1a2e',
    icon: '💎',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey'
  },
  mistral: {
    name: 'Mistral',
    label: 'Mistral AI',
    color: '#FF7000',
    bg: '#251500',
    icon: '🌀',
    placeholder: '...',
    docsUrl: 'https://console.mistral.ai/api-keys/'
  },
  groq: {
    name: 'Groq',
    label: 'Groq',
    color: '#F55036',
    bg: '#200d0a',
    icon: '⚡',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys'
  },
  cohere: {
    name: 'Cohere',
    label: 'Cohere',
    color: '#39D9B5',
    bg: '#0a201c',
    icon: '🔷',
    placeholder: '...',
    docsUrl: 'https://dashboard.cohere.com/api-keys'
  },
  huggingface: {
    name: 'HuggingFace',
    label: 'HuggingFace',
    color: '#FFD21E',
    bg: '#1f1a00',
    icon: '🤗',
    placeholder: 'hf_...',
    docsUrl: 'https://huggingface.co/settings/tokens'
  }
};

export const getProvider = (key) => PROVIDERS[key?.toLowerCase()] || {
  name: key,
  label: key,
  color: '#888',
  bg: '#1a1a1a',
  icon: '🔑',
  placeholder: '...'
};

export const formatNumber = (n) => {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

export const formatCredits = (n) => {
  if (n === null || n === undefined) return '—';
  return `$${parseFloat(n).toFixed(4)}`;
};

export const getUsagePercent = (used, total) => {
  if (!total || total === 0) return null;
  return Math.min(100, Math.round((used / total) * 100));
};

export const timeAgo = (date) => {
  if (!date) return 'Never';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
