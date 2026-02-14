export type UserRole = 'student' | 'vendor' | 'super_admin' | 'ganimi_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePicture?: string;
  phone?: string;
  isProfileComplete?: boolean;
}

export type Gender = 'male' | 'female' | 'other' | '';

export interface Branch {
  id: string | number;
  branchName: string;
  branchAddress: string;
  branchPincode: string;
}

export interface VendorProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  gender?: Gender | string;
  address?: string;
  pincode?: string;
  /**
   * Date of birth as returned by the API.
   * Field name from backend: "dob"
   */
  dob?: string;
  qualification?: string;
  experience?: string;
  aadharNumber?: string;
  panNumber?: string;
  achievements?: string;
  // Bank details
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolderName?: string;
  bankIfscCode?: string;
  role?: UserRole;
  isProfileComplete?: boolean;
  isVerified?: string;
  /** Backend may return verification status as verificationStatus */
  verificationStatus?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  categoryId?: string;
  branches?: Branch[];
}

export interface VendorOnboardingStatus {
  vendorId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileCompleted: boolean;
  institutionCompleted: boolean;
  bankCompleted: boolean;
  onboardingCompleted: boolean;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  gender?: Gender | string;
  address?: string;
  pincode?: string;
  /**
   * Date of birth as returned by the API.
   * Field name from backend: \"dateOfBirth\" or \"dob\".
   */
  dob?: string;
  school?: string;
  grade?: string;
  nickname?: string;
  profilePicture?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantId: string;
}

export interface LoginResponse {
  status: string;
  message: string;
  mustResetPassword?: boolean;
  user: User;
  /** Backend may send tokens in body for mobile (cookie names: access_token, refresh_token) */
  access_token?: string;
  refresh_token?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  category?: string; // Required for vendors
  tenantId: string;
}

export interface RegisterResponse {
  status: string;
  message: string;
}

export interface ApiErrorResponse {
  status: string;
  message: string;
  error?: string;
}
