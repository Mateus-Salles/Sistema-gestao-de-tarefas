import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

async function hashPass(password) {
  const salt = randomBytes(16).toString('hex');
  const derivative = await scryptAsync(password, salt, KEY_LEN);

  return `${salt}:${derivative.toString('hex')}`;
}

async function verifyPass(password, hashPassword) {
  const [salt, hash] = String(hashPassword).split(':');

  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  if (expected.length === 0) return false;

  const derivative = await scryptAsync(password, salt, expected.length);

  return timingSafeEqual(derivative, expected);
}

export { hashPass, verifyPass };
