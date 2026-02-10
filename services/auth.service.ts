import { apiService } from './api';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
  VendorProfile,
  VendorOnboardingStatus,
  Gender,
  Branch,
  StudentProfile,
} from '@/types/auth';
import { API_CONFIG } from '@/constants/config';
import { tokenStorage } from './tokenStorage';

export interface UpdateVendorProfilePayload {
  name?: string;
  phone?: string;
  gender?: Gender | string;
  address?: string;
  pincode?: string;
  /**
   * Field name expected by backend: "dateOfBirth"
   */
  dateOfBirth?: string;
  qualification?: string;
  experience?: string;
  aadharNumber?: string;
  panNumber?: string;
  achievements?: string;
}

export interface UpdateInstitutionProfilePayload {
  institutionName: string;
  institutionPhone: string;
  institutionEmail: string;
  branches: Branch[];
}

export interface UpdateBankProfilePayload {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolderName: string;
  bankIfscCode: string;
}

export interface UpdateStudentProfilePayload {
  name?: string;
  phone?: string;
  gender?: Gender | string;
  address?: string;
  pincode?: string;
  /**
   * Field name expected by backend: \"dateOfBirth\"
   */
  dateOfBirth?: string;
  school?: string;
  grade?: string;
  nickname?: string;
}

export interface UpdateGuardianProfilePayload {
  fatherName?: string;
  fatherPhone?: string;
  fatherEmail?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  motherEmail?: string;
  motherOccupation?: string;
}

export interface UpdatePasswordPayload {
  oldPassword: string;
  newPassword: string;
}

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return apiService.post<LoginResponse>('/auth/login', credentials);
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return apiService.post<RegisterResponse>('/auth/register', data);
  }

  async getCurrentUser(): Promise<{ status: string; message: string; user: User }> {
    return apiService.get<{ status: string; message: string; user: User }>('/auth/me');
  }

  /**
   * Get full vendor profile (for vendor screens).
   * Backend endpoint: GET /auth/profile (preferred), falls back to /auth/user.
   */
  async getUserProfile(): Promise<{ status: string; message: string; data: VendorProfile }> {
    try {
      return await apiService.get<{ status: string; message: string; data: VendorProfile }>('/auth/profile');
    } catch (err) {
      // Fallback to legacy endpoint if /auth/profile is not available
      return apiService.get<{ status: string; message: string; data: VendorProfile }>('/auth/user');
    }
  }

  /**
   * Get student profile (auth/user).
   */
  async getStudentProfile(): Promise<{ status: string; message: string; data: StudentProfile }> {
    return apiService.get<{ status: string; message: string; data: StudentProfile }>('/auth/user');
  }

  /**
   * Update student profile (personal information).
   * Backend endpoint: PUT /auth/update-student-profile
   */
  async updateStudentProfile(
    payload: UpdateStudentProfilePayload
  ): Promise<{ status: string; message: string }> {
    return apiService.put<{ status: string; message: string }>('/auth/update-student-profile', payload);
  }

  /**
   * Update parents/guardian information for a student.
   * Backend endpoint: PUT /auth/update-guardian-profile
   */
  async updateGuardianProfile(
    payload: UpdateGuardianProfilePayload
  ): Promise<{ status: string; message: string }> {
    return apiService.put<{ status: string; message: string }>('/auth/update-guardian-profile', payload);
  }

  /**
   * Upload / update profile image for current user.
   * Backend endpoint: PUT /auth/update-profile-image (multipart/form-data).
   */
  async uploadProfileImage(
    uri: string,
    mimeType: string,
    filename: string
  ): Promise<{ status: string; message: string; profilePicture?: string }> {
    const { access_token, refresh_token } = await tokenStorage.getBoth();
    const cookieParts: string[] = [];
    if (access_token) cookieParts.push(`access_token=${encodeURIComponent(access_token)}`);
    if (refresh_token) cookieParts.push(`refresh_token=${encodeURIComponent(refresh_token)}`);
    const cookieHeader = cookieParts.join('; ');

    if (__DEV__) {
      console.log('[AuthService] uploadProfileImage cookies', {
        hasAccess: !!access_token,
        hasRefresh: !!refresh_token,
        accessPreview: access_token ? `${access_token.substring(0, 15)}...` : 'null',
        refreshPreview: refresh_token ? `${refresh_token.substring(0, 15)}...` : 'null',
      });
    }

    const formData = new FormData();
    formData.append('profilePicture', {
      uri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/update-profile-image`, {
      method: 'PUT',
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      // IMPORTANT: do NOT let fetch attach its own cookies; we manage them manually
      credentials: 'omit',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw {
        status: data.status || 'error',
        message: data.message || 'Failed to upload profile image',
        error: data.error,
      };
    }

    return data;
  }

  async getVendorOnboardingStatus(): Promise<{
    status: string;
    message: string;
    data: VendorOnboardingStatus;
  }> {
    return apiService.get<{ status: string; message: string; data: VendorOnboardingStatus }>(
      '/auth/vendor-onboarding-status'
    );
  }

  async updateVendorProfile(payload: UpdateVendorProfilePayload): Promise<{ status: string; message: string }> {
    return apiService.put<{ status: string; message: string }>('/auth/update-vendor-profile', payload);
  }

  async updateInstitutionProfile(
    payload: UpdateInstitutionProfilePayload
  ): Promise<{ status: string; message: string }> {
    return apiService.put<{ status: string; message: string }>('/auth/update-institution-profile', payload);
  }

  async updateBankProfile(payload: UpdateBankProfilePayload): Promise<{ status: string; message: string }> {
    return apiService.put<{ status: string; message: string }>('/auth/update-bank-profile', payload);
  }

  /**
   * Update password for the currently authenticated user.
   * Backend endpoint: PUT /auth/update-password
   */
  async updatePassword(payload: UpdatePasswordPayload): Promise<{ status: string; message: string }> {
    return apiService.put<{ status: string; message: string }>('/auth/update-password', payload);
  }

  async logout(): Promise<{ status: string; message: string }> {
    return apiService.post<{ status: string; message: string }>('/auth/logout');
  }

  async resetPassword(email: string, tenantId: string): Promise<{ status: string; message: string }> {
    return apiService.post<{ status: string; message: string }>('/auth/reset-password', {
      email,
      tenantId,
    });
  }
}

export const authService = new AuthService();




