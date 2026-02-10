import { apiService } from './api';
import type { Branch } from '@/types/auth';

interface BranchApiItem {
  id: string;
  vendorId: string;
  branchName: string;
  address: string;
  pincode: string;
  latitude?: string;
  longitude?: string;
}

interface BranchesResponse {
  status: string;
  message: string;
  data: BranchApiItem[];
}

class BranchService {
  /**
   * Get all branches for a vendor by user ID.
   * Backend endpoint: GET /branch/vendor/:id
   */
  async getBranchesForVendor(vendorId: string): Promise<Branch[]> {
    const response = await apiService.get<BranchesResponse>(`/branch/vendor/${vendorId}`);

    return response.data.map((b) => ({
      id: b.id,
      branchName: b.branchName,
      branchAddress: b.address,
      branchPincode: b.pincode,
    }));
  }
}

export const branchService = new BranchService();

