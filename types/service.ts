export interface VendorService {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  price?: number;
  branchName?: string;
  branchAddress?: string;
  branchPincode?: string;
  totalBatches?: number;
  totalStudents?: number;
  totalRevenue?: number;
}

export interface VendorServicesResponse {
  status: string;
  message: string;
  data: VendorService[];
}

