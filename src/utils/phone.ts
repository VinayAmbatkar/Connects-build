export const INVALID_PHONE_MESSAGE = 'Please enter a valid phone number.';

/**
 * Whether `number` (digits only, no country code) is a valid phone number.
 * India (+91, also the default when no code is stored) needs a 10-digit
 * mobile number starting 6-9; any other country code 6 to 15 digits.
 */
export function isValidPhoneNumber(number: string, countryCode?: string | null): boolean {
  const digits = number.trim();
  const code = (countryCode ?? '').trim();
  if (code === '' || code === '+91' || code === '91') {
    return /^[6-9][0-9]{9}$/.test(digits);
  }
  return /^[0-9]{6,15}$/.test(digits);
}
