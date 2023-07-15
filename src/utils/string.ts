import crypto from 'crypto';

export const strongRandom = (size: number = 32, encoding = 'base64') => 
  crypto.randomBytes(size).toString(encoding);