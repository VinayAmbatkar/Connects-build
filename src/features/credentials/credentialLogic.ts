import {
  OTHER_BODY_CODE,
  type Credential,
  type CredentialKind,
  type CredentialOptions,
  type CredentialRequest,
  type LicensingBody,
} from '@/src/api/credentials';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type CredentialForm = CredentialRequest & { noExpiry: boolean };

export function emptyForm(kind: CredentialKind, specialization = ''): CredentialForm {
  return {
    kind,
    bodyCode: '',
    issuerName: '',
    name: '',
    specialization: kind === 'LICENSE' ? specialization : '',
    credentialNumber: '',
    issueDate: '',
    expiryDate: '',
    credentialUrl: '',
    noExpiry: true,
  };
}

export function formFromCredential(c: Credential): CredentialForm {
  return {
    kind: c.kind,
    bodyCode: c.bodyCode,
    // A catalog body's name comes from the catalog; only OTHER is typed.
    issuerName: c.bodyCode && c.bodyCode !== OTHER_BODY_CODE ? '' : c.issuerName,
    name: c.name,
    specialization: c.specialization,
    credentialNumber: c.credentialNumber,
    issueDate: c.issueDate,
    expiryDate: c.expiryDate,
    credentialUrl: c.credentialUrl,
    noExpiry: !c.expiryDate,
  };
}

export function toRequest(form: CredentialForm): CredentialRequest {
  const { noExpiry, ...rest } = form;
  return {
    ...rest,
    issuerName: rest.issuerName.trim(),
    name: rest.name.trim(),
    credentialNumber: rest.credentialNumber.trim(),
    expiryDate: noExpiry ? '' : rest.expiryDate,
    credentialUrl: rest.credentialUrl.trim(),
  };
}

/** "2024-03-05" in the device's local calendar. */
export function todayIso(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Typing helper for YYYY-MM-DD: keeps digits and inserts the dashes. */
export function maskDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Client checks mirroring the backend's (and the web editor's). Returns an
 *  error message, or '' when the form can be saved. */
export function validateForm(form: CredentialForm, today = todayIso()): string {
  if (form.kind === 'LICENSE') {
    if (!form.bodyCode) return 'Select a licensing body.';
    if (form.bodyCode === OTHER_BODY_CODE && form.issuerName.trim().length < 2) {
      return "Enter the licensing body's name.";
    }
  } else {
    if (form.name.trim().length < 2) return 'Enter the certificate name.';
    if (form.issuerName.trim().length < 2) return 'Enter the issuing organization.';
    if (!form.issueDate) return 'Enter the date of issue.';
  }
  if (form.issueDate && !isValidDate(form.issueDate)) return 'Enter the date of issue as YYYY-MM-DD.';
  if (!form.noExpiry && form.expiryDate && !isValidDate(form.expiryDate)) {
    return 'Enter the expiry date as YYYY-MM-DD.';
  }
  if (form.issueDate && form.issueDate > today) return "The date of issue can't be in the future.";
  if (!form.noExpiry && form.expiryDate && form.issueDate && form.expiryDate < form.issueDate) {
    return "The expiry date can't be before the date of issue.";
  }
  const url = form.credentialUrl.trim();
  if (url && !/^https?:\/\/\S+\.\S+/i.test(url)) {
    return 'Enter a valid link starting with http:// or https://.';
  }
  return '';
}

/** "Mar 2024" from YYYY-MM-DD. */
export function formatMonthYear(iso: string): string {
  if (!isValidDate(iso)) return '';
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Display name of the issuing body / organisation. */
export function issuerLabel(c: Pick<Credential, 'bodyShortName' | 'issuerName'>): string {
  return c.bodyShortName || c.issuerName;
}

/**
 * Licensing bodies split into "suggested for your specializations" first
 * and everything else, each without duplicates. OTHER is never listed --
 * the picker offers it separately.
 */
export function groupBodies(
  options: CredentialOptions | undefined,
  specializations: string[],
): { suggested: LicensingBody[]; others: LicensingBody[] } {
  if (!options) return { suggested: [], others: [] };
  const byCode = new Map(options.bodies.map((b) => [b.code, b]));
  const codes: string[] = [];
  for (const spec of specializations) {
    for (const code of options.bySpecialization?.[spec] ?? []) {
      if (!codes.includes(code)) codes.push(code);
    }
  }
  if (!codes.length) codes.push(...(options.fallback ?? []));
  const suggested = codes
    .map((c) => byCode.get(c))
    .filter((b): b is LicensingBody => !!b && b.code !== OTHER_BODY_CODE);
  const suggestedSet = new Set(suggested.map((b) => b.code));
  const others = options.bodies.filter(
    (b) => b.code !== OTHER_BODY_CODE && !suggestedSet.has(b.code),
  );
  return { suggested, others };
}
