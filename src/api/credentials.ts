import { Platform } from 'react-native';
import { apiClient } from '@/src/api/client';
import { appendNativeFile } from '@/src/utils/nativeFormData';

// Mirrors Backend-tech internal/credential (GET/POST/PUT/DELETE
// /profile/credentials...). Same data the web "Licenses & Certifications"
// editor manages; the profile embeds it as `licenses` + `certifications`.

export type CredentialKind = 'LICENSE' | 'CERTIFICATION';

/** "Other -- type the name" choice in the licensing-body list. */
export const OTHER_BODY_CODE = 'OTHER';

export interface LicensingBody {
  code: string;
  shortName: string;
  name: string;
  type: 'STATUTORY' | 'PROFESSIONAL' | 'INTERNATIONAL';
}

export interface CredentialOptions {
  bodies: LicensingBody[];
  /** Specialization code -> suggested body codes, in display order. */
  bySpecialization: Record<string, string[]>;
  fallback: string[];
}

export interface Credential {
  id: number;
  kind: CredentialKind;
  bodyCode: string;
  bodyShortName: string;
  issuerName: string;
  name: string;
  specialization: string;
  credentialNumber: string;
  /** YYYY-MM-DD, '' if unset. */
  issueDate: string;
  issueYear: number;
  /** '' = does not expire. */
  expiryDate: string;
  expired: boolean;
  credentialUrl: string;
  documentUrl: string;
}

export interface CredentialRequest {
  kind: CredentialKind;
  bodyCode: string;
  issuerName: string;
  name: string;
  specialization: string;
  credentialNumber: string;
  issueDate: string;
  expiryDate: string;
  credentialUrl: string;
}

export interface CredentialList {
  licenses: Credential[];
  certifications: Credential[];
  max: number;
}

export type PickedFile = { uri: string; name: string; type: string; file?: File };

export const credentialsApi = {
  options: () =>
    apiClient.get<CredentialOptions>('/profile/credentials/options').then((r) => r.data),
  list: () => apiClient.get<CredentialList>('/profile/credentials').then((r) => r.data),
  create: (body: CredentialRequest) =>
    apiClient.post<Credential>('/profile/credentials', body).then((r) => r.data),
  update: (id: number, body: CredentialRequest) =>
    apiClient.put<Credential>(`/profile/credentials/${id}`, body).then((r) => r.data),
  remove: (id: number) => apiClient.delete(`/profile/credentials/${id}`).then((r) => r.data),
  /** PDF or image of the certificate; replaces any earlier one. */
  uploadDocument: (id: number, file: PickedFile) => {
    const form = new FormData();
    if (Platform.OS === 'web' && file.file) {
      form.append('file', file.file);
    } else {
      appendNativeFile(form, 'file', { uri: file.uri, name: file.name, type: file.type });
    }
    return apiClient
      .post<Credential>(`/profile/credentials/${id}/document`, form, {
        timeout: 60000,
      })
      .then((r) => r.data);
  },
  removeDocument: (id: number) =>
    apiClient.delete<Credential>(`/profile/credentials/${id}/document`).then((r) => r.data),
};
