import elliptic from 'elliptic';

const ec = new elliptic.ec("secp256k1");

// const privateKey = ec.
const key = ec.genKeyPair();
const privateKey = key.getPrivate('hex');
const publicKey = key.getPublic('hex');

export default {
    privateKey,
    publicKey,
    key
}