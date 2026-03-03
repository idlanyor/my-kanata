import crypto from 'crypto';

const KEY_LENGTH = 64;

export const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        salt,
        hash: derivedKey.toString('hex')
      });
    });
  });
};

export const verifyPassword = async (password, salt, expectedHash) => {
  const { hash } = await hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
