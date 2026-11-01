import { apiClient } from '@/src/api/client';
import type {
  VerificationStatusResponse,
  AadhaarOTPGenerateResponse,
  AadhaarOTPVerifyResponse,
  GSTVerificationResult,
} from '@/src/types/api';

export const verificationApi = {
  getMyStatus: () =>
    apiClient.get<VerificationStatusResponse>('/profile/verification/status').then((r) => r.data),

  // Aadhaar OTP flow
  requestAadhaarOTP: (aadhaarNumber: string) =>
    apiClient
      .post<AadhaarOTPGenerateResponse>('/profile/verification/aadhaar/otp/generate', { aadhaar_number: aadhaarNumber })
      .then((r) => r.data),

  verifyAadhaarOTP: (sessionId: string, otp: string) =>
    apiClient
      .post<AadhaarOTPVerifyResponse>('/profile/verification/aadhaar/otp/verify', { session_id: sessionId, otp })
      .then((r) => r.data),

  // Manual Aadhaar submission (with documents)
  submitAadhaar: (
    legalName: string,
    aadharNumber: string,
    documents: { uri: string; name: string; type: string }[],
    linkedMobile?: string,
    companyEmail?: string
  ) => {
    const form = new FormData();
    form.append('legalName', legalName);
    form.append('aadharNumber', aadharNumber);
    if (linkedMobile) form.append('linkedMobile', linkedMobile);
    if (companyEmail) form.append('companyEmail', companyEmail);
    documents.forEach((doc) => form.append('documents', doc as any));
    return apiClient.post<{ status: string }>('/profile/verification/aadhaar', form).then((r) => r.data);
  },

  // GST/TAN verification (Business Owner)
  submitGstTan: (
    companyLegalName: string,
    gstNumber: string,
    tanNumber: string,
    documents: { uri: string; name: string; type: string }[],
    registeredOffice?: string,
    registeredEmail?: string,
    registeredContact?: string,
    registeredServiceType?: string
  ) => {
    const form = new FormData();
    form.append('companyLegalName', companyLegalName);
    if (gstNumber) form.append('gstNumber', gstNumber);
    if (tanNumber) form.append('tanNumber', tanNumber);
    if (registeredOffice) form.append('registeredOffice', registeredOffice);
    if (registeredEmail) form.append('registeredEmail', registeredEmail);
    if (registeredContact) form.append('registeredContact', registeredContact);
    if (registeredServiceType) form.append('registeredServiceType', registeredServiceType);
    documents.forEach((doc) => form.append('documents', doc as any));
    return apiClient.post<{ status: string }>('/profile/verification/gst-tan', form).then((r) => r.data);
  },

  // License verification (Business Owner alternative)
  submitLicense: (
    licenseNumber: string,
    companyEmail: string,
    documents: { uri: string; name: string; type: string }[]
  ) => {
    const form = new FormData();
    form.append('licenseNumber', licenseNumber);
    form.append('companyEmail', companyEmail);
    documents.forEach((doc) => form.append('documents', doc as any));
    return apiClient.post<{ status: string }>('/profile/verification/license', form).then((r) => r.data);
  },

  // Employee verification
  submitEmployee: (
    legalName: string,
    companyEmail: string,
    aadharNumber: string,
    licenseNumber: string,
    documents: { uri: string; name: string; type: string }[],
    licensingAuthority?: string,
    certifications?: string
  ) => {
    const form = new FormData();
    form.append('legalName', legalName);
    form.append('companyEmail', companyEmail);
    form.append('aadharNumber', aadharNumber);
    form.append('licenseNumber', licenseNumber);
    if (licensingAuthority) form.append('licensingAuthority', licensingAuthority);
    if (certifications) form.append('certifications', certifications);
    documents.forEach((doc) => form.append('documents', doc as any));
    return apiClient.post<{ status: string }>('/profile/verification/employee', form).then((r) => r.data);
  },

  // TrueID GST Simple verification
  submitGSTVerification: (gstNumber: string, legalBusinessName: string) =>
    apiClient
      .post<GSTVerificationResult>('/profile/verification/gst', { gstNumber, legalBusinessName })
      .then((r) => r.data),

  // Employee email OTP
  sendEmployeeEmailOTP: (email: string) =>
    apiClient.post<{ message: string }>('/profile/verification/employee/email/otp/send', { email }).then((r) => r.data),

  verifyEmployeeEmailOTP: (email: string, code: string) =>
    apiClient.post<{ message: string }>('/profile/verification/employee/email/otp/verify', { email, code }).then((r) => r.data),
};