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
} from '@/types/auth';

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

  async getUserProfile(): Promise<{ status: string; message: string; data: VendorProfile }> {
    return apiService.get<{ status: string; message: string; data: VendorProfile }>('/auth/user');
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




