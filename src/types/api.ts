import type { Credential } from '@/src/api/credentials';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserSummary = {
  id: string | number;
  fullName?: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
};

export type LoginResponse = AuthTokens & {
  user?: UserSummary;
};

export type SignupPayload = {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  password: string;
  role: string;
};

export type ProfessionalProfile = {
  /** Set when the viewer's plan doesn't include full profiles: the rest of
   *  this object is the redacted profile and `offer` says what to show. */
  lockedFeature?: string;
  offer?: import('@/src/api/freemium').FreemiumOffer;
  projectCount?: number;
  fullName?: string;
  email?: string;
  website?: string;
  company?: string;
  role?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  firmLocationIds?: string[];
  serviceLocations?: string[];
  yearsExperience?: number;
  bio?: string;
  socialMedia?: string;
  awards?: number;
  gstNumber?: string;
  disciplineIds?: string[];
  specializationIds?: string[];
  projectTypeIds?: string[];
  topSkills?: string[];
  /** Self-reported licences / certifications (Backend internal/credential). */
  licenses?: Credential[];
  certifications?: Credential[];
  categorySelections?: unknown[];
  linkedIn?: string;
  instagram?: string;
  twitter?: string;
  /** Profile badge (models.User.Verified) -- true once Aadhaar OKYC or a
   *  manual verification is approved. */
  verified?: boolean;
  /** BUSINESS_OWNER | EMPLOYEE | INDIVIDUAL_CONSULTANT for Consultants/Contractors/Vendors. */
  employmentType?: string;
  /** @deprecated never sent by the backend; use `verified`. */
  businessVerified?: boolean;
  businessName?: string;
  /** Verification badge earned timestamp */
  verifiedAt?: string;
  [key: string]: unknown;
};

export type ProfileOptions = {
  roles?: Array<{ id?: string; name?: string; label?: string; value?: string }>;
  disciplines?: Array<{
    id?: string;
    name?: string;
    label?: string;
    roleId?: string;
    roleIds?: string[];
  }>;
  specializations?: Array<{
    id?: string;
    name?: string;
    label?: string;
    disciplineId?: string;
    disciplineIds?: string[];
  }>;
  projectTypes?: Array<{ id?: string; name?: string; label?: string }>;
  locations?: Array<{ id?: string; name?: string; label?: string }>;
  [key: string]: unknown;
};

export type EventItem = {
  id: string | number;
  title?: string;
  description?: string;
  location?: string;
  eventDate?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
  coverImage?: string;
  /** Feed author display name (from listFeed). */
  authorName?: string;
  /** Poster's professional role (feed only), e.g. CONSULTANTS. */
  ownerRole?: string;
  /** Poster completed every verification step their role requires (feed only). */
  ownerVerified?: boolean;
  /** Poster's identity and GST registration are verified (feed only). */
  ownerBusinessVerified?: boolean;
  ownerName?: string;
  authorId?: string | number;
  userId?: string | number;
  photoUrls?: string[];
  photos?: string[];
  videoUrl?: string;
  /** Interaction counts and state */
  likeCount?: number;
  likedByMe?: boolean;
  commentCount?: number;
  shareCount?: number;
  sharedByMe?: boolean;
  /** Nested comments (from event detail) */
  comments?: Comment[];
  [key: string]: unknown;
};

export type EventListResponse = {
  events?: EventItem[];
  count?: number;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    offset?: number;
  };
};

export type Comment = {
  id: string | number;
  eventId: string | number;
  body: string;
  createdAt: string;
  updatedAt?: string;
  authorId: string | number;
  authorName: string;
  authorAvatar?: string;
  parentCommentId?: string | number;
  likeCount?: number;
  likedByMe?: boolean;
  replies?: Comment[];
  depth?: number;
  replyCount?: number;
  /** Backend returns author info in nested commenter object */
  commenter?: {
    userId: string | number;
    name: string;
    role?: string;
  };
  /** Mentions in this comment */
  mentions?: Array<{
    userId: string | number;
    name: string;
  }>;
};

export type CommentListResponse = {
  comments?: Comment[];
  count?: number;
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    offset?: number;
  };
};

export type LikeResponse = {
  liked: boolean;
  likeCount: number;
};

export type ShareResponse = {
  shared: boolean;
  shareCount: number;
  shareUrl?: string;
};

export type Conversation = {
  id: string | number;
  participantName?: string;
  participantId?: string | number;
  participantRole?: string;
  participantBio?: string;
  participantCompany?: string;
  participantLocation?: string;
  online?: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  updatedAt?: string;
  createdAt?: string;
  otherPartyId?: string | number;
  otherPartyName?: string;
  otherPartyRole?: string;
  otherPartyBio?: string;
  otherPartyOnline?: boolean;
  lastMessagePreview?: string;
  [key: string]: unknown;
};

export type Message = {
  id: string | number;
  conversationId?: string | number;
  body?: string;
  senderId?: string | number;
  recipientId?: string | number;
  isRead?: boolean;
  createdAt?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf' | 'audio' | string;
  attachmentName?: string;
  /** Set on a group-chat message (conversationId is then 0). */
  groupId?: number;
  /** Who wrote it -- filled for group messages. */
  senderName?: string;
  [key: string]: unknown;
};

/** Mirrors internal/message.GroupMemberResponse. */
export type GroupMember = {
  userId: string;
  name: string;
  userRole?: string;
  role: 'admin' | 'member';
  online: boolean;
  joinedAt: string;
};

/** Mirrors internal/message.GroupResponse. members only from groupsApi.get. */
export type GroupChat = {
  id: number;
  name: string;
  createdById: string;
  myRole: 'admin' | 'member';
  memberCount: number;
  maxMembers: number;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  members?: GroupMember[];
};

export type Connection = {
  id: string | number;
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
  direction?: 'incoming' | 'outgoing' | string;
  fullName?: string;
  role?: string;
  company?: string;
  userId?: string | number;
  recipientId?: string | number;
  requesterId?: string | number;
  otherPartyId?: string | number;
  otherPartyName?: string;
  otherPartyRole?: string;
  otherPartyCompany?: string;
  otherPartyLocation?: string;
  otherPartyBio?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type ConnectionSummary = {
  all?: number;
  connections?: number;
  receivedRequests?: number;
  sentRequests?: number;
  newThisMonth?: number;
};

export type ProfessionalSearchResult = {
  id: string | number;
  userId?: string | number;
  fullName?: string;
  name?: string;
  role?: string;
  company?: string;
  location?: string;
  bio?: string;
  yearsExperience?: number;
  projectCount?: number;
  specializationIds?: string[];
  disciplineIds?: string[];
  serviceLocations?: string[];
  firmLocationIds?: string[];
  [key: string]: unknown;
};

export type Project = {
  id: string | number;
  name?: string;
  title?: string;
  description?: string;
  locationId?: string;
  sizeSqft?: number;
  photos?: string[];
  startDate?: string;
  endDate?: string;
  skills?: string[];
  [key: string]: unknown;
};


export type Listing = {
  id: string | number;
  title?: string;
  category?: string;
  description?: string;
  price?: number;
  photos?: string[];
  [key: string]: unknown;
};

// Mirrors Backend-tech internal/notification NotificationResponse.
export type NotificationItem = {
  id: number;
  actorId: string;
  actorName?: string;
  type: string;
  message: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

export type PremiumPlan = {
  id: string;
  name?: string;
  price?: number;
  description?: string;
  features?: string[];
  [key: string]: unknown;
};

export type SupportCase = {
  id: string | number;
  type?: string;
  subject?: string;
  description?: string;
  status?: string;
  [key: string]: unknown;
};

/** Verification types matching backend */
export type VerificationRequestType = 'AADHAAR' | 'GST_TAN' | 'LICENSE' | 'EMPLOYEE' | 'INDIVIDUAL_CONSULTANT';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type GSTVerificationStatus = 'PENDING' | 'VERIFIED' | 'MISMATCH' | 'INACTIVE' | 'FAILED' | '';

export interface GSTVerificationResult {
  status: GSTVerificationStatus;
  gstin: string;
  maskedGstin: string;
  legalName?: string;
  tradeName?: string;
  panNumber?: string;
  constitutionOfBusiness?: string;
  taxpayerType?: string;
  gstinStatus?: string;
  registrationDate?: string;
  cancellationDate?: string;
  stateJurisdiction?: string;
  centreJurisdiction?: string;
  principalAddress?: {
    fullAddress?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  } | null;
  natureOfBusiness?: string[];
  failureReason?: string;
  attemptsRemaining: number;
  retryAfter?: string;
}

export interface VerificationRequestSummary {
  id: number;
  status: VerificationStatus;
  type: VerificationRequestType;
  companyLegalName?: string;
  legalName?: string;
  companyEmail?: string;
  linkedMobile?: string;
  registeredOffice?: string;
  registeredEmail?: string;
  registeredContact?: string;
  registeredServiceType?: string;
  licensingAuthority?: string;
  certifications?: string;
  maskedNumber?: string;
  maskedLicenseNumber?: string;
  documentUrls?: string[];
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface EmployeeEmailVerificationStatus {
  email: string;
  verified: boolean;
  codePending: boolean;
}

export interface VerificationStatusResponse {
  aadhaar: VerificationRequestSummary | null;
  aadhaarAttemptsRemaining?: number;
  aadhaarRetryAfter?: string;
  gstTan: VerificationRequestSummary | null;
  license: VerificationRequestSummary | null;
  employee: VerificationRequestSummary | null;
  /** Individual Consultant's licence + proof-of-consultancy review. */
  individualConsultant?: VerificationRequestSummary | null;
  employeeEmail: EmployeeEmailVerificationStatus | null;
  gst: GSTVerificationResult | null;
}

export interface AadhaarOTPGenerateResponse {
  message: string;
  session_id: string;
}

export interface AadhaarOTPVerifyResponse {
  status: string;
  message: string;
  kyc_data?: {
    verified?: boolean;
    aadhaar_masked?: string;
    name?: string;
    dob?: string;
    gender?: string;
    care_of?: string;
    address?: {
      house?: string;
      street?: string;
      landmark?: string;
      locality?: string;
      vtc?: string;
      subdist?: string;
      district?: string;
      state?: string;
      pincode?: string;
      post?: string;
      country?: string;
    } | null;
    photo?: string | null;
    photo_mime?: string | null;
    share_code?: string;
    email?: string | null;
    mobile?: string | null;
    reference_id?: string;
    transaction_id?: string;
    generated_at?: string;
    failure_code?: string | null;
    failure_reason?: string | null;
  } | null;
}
