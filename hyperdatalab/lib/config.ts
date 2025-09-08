export type RequiredEnv = {
  HYPERBROWSER_API_KEY: string;
  HB_BASE_URL?: string;
  OPENAI_API_KEY?: string; 
};

export function getEnv(): RequiredEnv {
  const {
    HYPERBROWSER_API_KEY,
    HB_BASE_URL,
    OPENAI_API_KEY,
  } = process.env as NodeJS.ProcessEnv & RequiredEnv;

  if (!HYPERBROWSER_API_KEY) throw new Error('Missing HYPERBROWSER_API_KEY');

  return { HYPERBROWSER_API_KEY, HB_BASE_URL, OPENAI_API_KEY };
}

export const HYPERBROWSER_DEFAULT_BASE_URL = 'https://api.hyperbrowser.ai';


