export type PhoneCountry = {
  id: string;
  name: string;
  flag: string;
  dialCode: string;
  /** National number length (digits only). */
  maxLength: number;
  placeholder: string;
};

/** Common signup countries with national mobile digit lengths. */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { id: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', maxLength: 10, placeholder: '98765 43210' },
  { id: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', maxLength: 10, placeholder: '201 555 0123' },
  { id: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', maxLength: 10, placeholder: '7400 123456' },
  { id: 'AE', name: 'UAE', flag: '🇦🇪', dialCode: '+971', maxLength: 9, placeholder: '50 123 4567' },
  { id: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', maxLength: 9, placeholder: '50 123 4567' },
  { id: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', maxLength: 8, placeholder: '8123 4567' },
  { id: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', maxLength: 9, placeholder: '412 345 678' },
  { id: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', maxLength: 10, placeholder: '416 555 0123' },
  { id: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49', maxLength: 11, placeholder: '1512 3456789' },
  { id: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33', maxLength: 9, placeholder: '6 12 34 56 78' },
];

export function getPhoneCountryById(id: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.id === id) ?? PHONE_COUNTRIES[0];
}

export function getPhoneCountryByDialCode(dialCode: string): PhoneCountry {
  return (
    PHONE_COUNTRIES.find((c) => c.dialCode === dialCode) ?? PHONE_COUNTRIES[0]
  );
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidNationalNumber(digits: string, country: PhoneCountry) {
  return digits.length === country.maxLength;
}
