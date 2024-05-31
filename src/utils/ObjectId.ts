
import crypto from 'crypto';
import Hash from './hash';

const deterministicObjectId = (input: string) => {
  // Generate a hash from the input to simulate unique parts of the ObjectId
  return Hash(input);
}

export default { 
  deterministicObjectId
}