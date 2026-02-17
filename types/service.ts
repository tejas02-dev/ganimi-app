// Service in a category (from GET /services/category/:id)
export interface CategoryService {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  price?: number;
  vendorName?: string;
  vendorId?: string;
}

export interface VendorService {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  price?: number;
  branchId?: string;
  branchName?: string;
  branchAddress?: string;
  branchPincode?: string;
  batchCount?: number;
  studentCount?: number;
  totalBatches?: number;
  totalStudents?: number;
  totalRevenue?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorServicesResponse {
  status: string;
  message: string;
  data: VendorService[];
}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  categoryId: string;
  branchId: string;
  /**
   * Backend accepts price as a number or numeric string.
   */
  price: number | string;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string;
  categoryId?: string;
  branchId?: string;
  price?: number;
}

export interface ServiceResponse {
  status: string;
  message: string;
  data: VendorService[];
}

export interface DeleteServiceResponse {
  status: string;
  message: string;
}

// Student's enrolled services (/services/student/:id)
export interface StudentService {
  id: string;
  name: string;
  description?: string;
  batchId?: string;
  batchName?: string;
  schedule?: string; // e.g. "Monday,Wednesday,Friday"
  status?: string; // e.g. "active"
  nextClass?: string; // ISO date string
}

export interface StudentServicesResponse {
  status: string;
  message: string;
  data: StudentService[];
}

// Student orders (/orders/student/:studentId)
export interface StudentOrder {
  orderId: string;
  orderType: string;
  status: string;
  amount: number;
  categoryName?: string;
  vendor?: {
    vendorId: string;
    vendorName: string;
    vendorEmail: string;
  };
}

export interface StudentOrdersResponse {
  status: string;
  message: string;
  data: StudentOrder[];
}
