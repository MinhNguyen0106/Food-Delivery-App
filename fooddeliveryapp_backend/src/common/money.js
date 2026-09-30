const AppError = require('../services/AppError');

const MAX_DECIMAL_CENTS = 999999999999;

function toCents(value, field = 'amount') {
  const match = /^(0|[1-9]\d{0,9})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) {
    throw new AppError(`${field} is outside the supported money range`, 400, 'INVALID_AMOUNT');
  }
  return Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0') || 0);
}

function fromCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > MAX_DECIMAL_CENTS) {
    throw new AppError('Calculated amount exceeds the supported range', 400, 'INVALID_AMOUNT');
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

module.exports = { MAX_DECIMAL_CENTS, toCents, fromCents };
