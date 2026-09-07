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
  certifications?: Certification[];
  categorySelections?: unknown[];
  linkedIn?: string;
  instagram?: string;
  twitter?: string;
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
  ownerName?: string;
  authorId?: string | number;
  userId?: string | number;
  photoUrls?: string[];
  photos?: string[];
  videoUrl?: string;
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
  [key: string]: unknown;
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

export type Certification = {
  id?: string | number;
  name?: string;
  title?: string;
  issuer?: string;
  issuedDate?: string;
  issueDate?: string;
  credentialId?: string;
  credentialUrl?: string;
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

export type NotificationItem = {
  id: string | number;
  title?: string;
  body?: string;
  read?: boolean;
  createdAt?: string;
  [key: string]: unknown;
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
