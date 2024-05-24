import crypto from 'crypto';

// Secret key for HMAC and AES - should be kept secure and not hardcoded in real applications
const secretKey = process.env.SECRET_SAUCE;

function encodeState(stateObject: Record<string, any>): string {
  // Serialize the state object to a JSON string
  const stateString = JSON.stringify(stateObject);

  // Encrypt the state using AES
  const secretKeyHex = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(16);  // Initialization vector for AES
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKeyHex, 'hex'), iv);
  let encrypted = cipher.update(stateString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Create an HMAC to ensure integrity
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(encrypted);
  const hash = hmac.digest('hex');

  // Return the iv, encrypted data, and HMAC in a format that can be included in a URL
  return encodeURIComponent(`${iv.toString('hex')}:${encrypted}:${hash}`);
}

function decodeState(encryptedState: string): Record<string, any> | null {
  const components = decodeURIComponent(encryptedState).split(':');
  if (components.length !== 3) return null;

  const [ivHex, encrypted, hash] = components;
  const secretKeyHex = crypto.createHash('sha256').update(secretKey).digest();
  // Verify HMAC to ensure integrity
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(encrypted);
  const recalculatedHash = hmac.digest('hex');

  if (recalculatedHash !== hash) {
    console.error('Invalid HMAC - possible tampering detected');
    return null;
  }

  // Decrypt the state using AES
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKeyHex, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  // Parse the JSON string back to an object
  try {
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Error parsing decrypted state JSON:', e);
    return null;
  }
}

const encoder = {
  encodeState,
  decodeState,
};

export default encoder;