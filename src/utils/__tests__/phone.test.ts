import { isValidPhoneNumber } from '@/src/utils/phone';

describe('isValidPhoneNumber', () => {
  it('accepts a 10-digit Indian mobile starting 6-9 (default country)', () => {
    expect(isValidPhoneNumber('9876543210')).toBe(true);
    expect(isValidPhoneNumber('6000000000', '+91')).toBe(true);
  });

  it('rejects wrong Indian numbers', () => {
    expect(isValidPhoneNumber('987654321')).toBe(false); // 9 digits
    expect(isValidPhoneNumber('98765432101')).toBe(false); // 11 digits
    expect(isValidPhoneNumber('3694994949')).toBe(false); // starts with 3
    expect(isValidPhoneNumber('0000000000', '+91')).toBe(false);
    expect(isValidPhoneNumber('')).toBe(false);
  });

  it('allows 6 to 15 digits for other countries', () => {
    expect(isValidPhoneNumber('4155550123', '+1')).toBe(true);
    expect(isValidPhoneNumber('12345', '+44')).toBe(false);
  });
});
