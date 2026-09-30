const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name) {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(name, fallback) {
  const rawValue = process.env[name] || String(fallback);
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

function parseDeliveryFeePerKm() {
  const rawValue = process.env.DELIVERY_FEE_PER_KM || '5000';
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0 || value > 9999999999.99) {
    throw new Error('DELIVERY_FEE_PER_KM must be between 0 and 9999999999.99');
  }
  return value;
}

module.exports = Object.freeze({
  port: parsePort('PORT', 3000),
  db: Object.freeze({
    host: required('DB_HOST'),
    port: parsePort('DB_PORT', 3306),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
  }),
  jwtSecret: (() => {
    const value = required('JWT_SECRET');
    if (Buffer.byteLength(value, 'utf8') < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes');
    }
    return value;
  })(),
  deliveryFeePerKm: parseDeliveryFeePerKm(),
});
