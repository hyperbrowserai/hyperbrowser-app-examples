import crypto from 'crypto';

export function stableHash(input: string | object): string {
  const data = typeof input === 'string' ? input : JSON.stringify(input);
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}


