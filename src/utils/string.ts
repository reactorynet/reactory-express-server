import crypto from 'crypto';

export const strongRandom = (size: number = 32, encoding = 'base64') => 
  crypto.randomBytes(size).toString(encoding);

export const scrubEmail = (email: string) => { 
  const [name, domain] = email.split('@');
  const scrubbedName = name.slice(0, 2) + '*'.repeat(name.length - 2);  
  return `${scrubbedName}@${domain}`;
}
