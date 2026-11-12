import type { CredentialOptions } from '@/src/api/credentials';
import {
  emptyForm,
  formFromCredential,
  formatMonthYear,
  groupBodies,
  isValidDate,
  maskDate,
  toRequest,
  validateForm,
} from '@/src/features/credentials/credentialLogic';

const TODAY = '2026-11-06';

describe('validateForm', () => {
  it('requires a licensing body for a licence, and a typed name for OTHER', () => {
    const f = emptyForm('LICENSE');
    expect(validateForm(f, TODAY)).toBe('Select a licensing body.');
    expect(validateForm({ ...f, bodyCode: 'OTHER' }, TODAY)).toBe("Enter the licensing body's name.");
    expect(validateForm({ ...f, bodyCode: 'OTHER', issuerName: 'State Board' }, TODAY)).toBe('');
    expect(validateForm({ ...f, bodyCode: 'COA' }, TODAY)).toBe('');
  });

  it('requires name, issuer and issue date for a certification', () => {
    const f = emptyForm('CERTIFICATION');
    expect(validateForm(f, TODAY)).toBe('Enter the certificate name.');
    expect(validateForm({ ...f, name: 'PMP' }, TODAY)).toBe('Enter the issuing organization.');
    expect(validateForm({ ...f, name: 'PMP', issuerName: 'PMI' }, TODAY)).toBe('Enter the date of issue.');
    expect(validateForm({ ...f, name: 'PMP', issuerName: 'PMI', issueDate: '2024-02-01' }, TODAY)).toBe('');
  });

  it('rejects bad and future dates and an expiry before issue', () => {
    const base = { ...emptyForm('LICENSE'), bodyCode: 'COA' };
    expect(validateForm({ ...base, issueDate: '2024-02-30' }, TODAY)).toMatch(/YYYY-MM-DD/);
    expect(validateForm({ ...base, issueDate: '2027-01-01' }, TODAY)).toMatch(/future/);
    expect(
      validateForm({ ...base, issueDate: '2024-01-01', noExpiry: false, expiryDate: '2023-01-01' }, TODAY),
    ).toMatch(/before the date of issue/);
    // An expiry is ignored entirely while "does not expire" is on.
    expect(validateForm({ ...base, issueDate: '2024-01-01', noExpiry: true, expiryDate: '2023-01-01' }, TODAY)).toBe('');
  });

  it('checks the certificate link', () => {
    const base = { ...emptyForm('LICENSE'), bodyCode: 'COA' };
    expect(validateForm({ ...base, credentialUrl: 'example.com' }, TODAY)).toMatch(/valid link/);
    expect(validateForm({ ...base, credentialUrl: 'https://example.com/c/1' }, TODAY)).toBe('');
  });
});

describe('form <-> request', () => {
  it('drops the expiry when it does not expire and trims text', () => {
    const req = toRequest({
      ...emptyForm('CERTIFICATION'),
      name: '  PMP ',
      issuerName: ' PMI ',
      issueDate: '2024-02-01',
      expiryDate: '2027-02-01',
      noExpiry: true,
    });
    expect(req).toMatchObject({ name: 'PMP', issuerName: 'PMI', expiryDate: '' });
    expect(req).not.toHaveProperty('noExpiry');
  });

  it('keeps a catalog body name out of the editable issuer field', () => {
    const form = formFromCredential({
      id: 1,
      kind: 'LICENSE',
      bodyCode: 'COA',
      bodyShortName: 'CoA',
      issuerName: 'Council of Architecture',
      name: '',
      specialization: '',
      credentialNumber: 'CA/1',
      issueDate: '',
      issueYear: 0,
      expiryDate: '2030-01-01',
      expired: false,
      credentialUrl: '',
      documentUrl: '',
    });
    expect(form.issuerName).toBe('');
    expect(form.noExpiry).toBe(false);
  });

  it('only pre-selects a specialization for licences', () => {
    expect(emptyForm('LICENSE', 'ARCHITECT').specialization).toBe('ARCHITECT');
    expect(emptyForm('CERTIFICATION', 'ARCHITECT').specialization).toBe('');
  });
});

describe('dates', () => {
  it('masks typed digits into YYYY-MM-DD', () => {
    expect(maskDate('2024')).toBe('2024');
    expect(maskDate('20240')).toBe('2024-0');
    expect(maskDate('20240315')).toBe('2024-03-15');
    expect(maskDate('2024-03-15-99')).toBe('2024-03-15');
  });

  it('validates calendar dates and formats month/year', () => {
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2023-02-29')).toBe(false);
    expect(formatMonthYear('2024-03-15')).toBe('Mar 2024');
    expect(formatMonthYear('')).toBe('');
  });
});

describe('groupBodies', () => {
  const options: CredentialOptions = {
    bodies: [
      { code: 'COA', shortName: 'CoA', name: 'Council of Architecture', type: 'STATUTORY' },
      { code: 'IGBC', shortName: 'IGBC', name: 'Indian Green Building Council', type: 'PROFESSIONAL' },
      { code: 'IEI', shortName: 'IEI', name: 'Institution of Engineers', type: 'PROFESSIONAL' },
      { code: 'OTHER', shortName: 'Other', name: 'Other', type: 'PROFESSIONAL' },
    ],
    bySpecialization: { ARCHITECT: ['COA', 'IGBC'], URBAN_PLANNER: ['IGBC'] },
    fallback: ['IEI'],
  };

  it('puts bodies for the user specializations first, without duplicates or OTHER', () => {
    const { suggested, others } = groupBodies(options, ['ARCHITECT', 'URBAN_PLANNER']);
    expect(suggested.map((b) => b.code)).toEqual(['COA', 'IGBC']);
    expect(others.map((b) => b.code)).toEqual(['IEI']);
  });

  it('falls back when no specialization has a mapping', () => {
    expect(groupBodies(options, []).suggested.map((b) => b.code)).toEqual(['IEI']);
  });
});
