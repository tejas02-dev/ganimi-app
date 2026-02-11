import { apiService } from './api';

export interface DirectoryVendor {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  branchName?: string;
  branchAddress?: string;
  branchPincode?: string;
  city?: string;
  state?: string;
  country?: string;
  serviceCount?: number;
  phone?: string;
  phoneNumber?: string;
  contactNumber?: string;
  mobile?: string;
  [key: string]: any;
}

export interface DirectoryPage {
  items: DirectoryVendor[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface DirectoryResponse {
  status?: string;
  message?: string;
  data: DirectoryVendor[];
  pagination?: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface DirectoryFilters {
  search?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  categoryId?: string;
}

class DirectoryService {
  async getDirectory(page: number, limit: number, filters: DirectoryFilters = {}): Promise<DirectoryPage> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    if (filters.search && filters.search.trim()) {
      params.append('search', filters.search.trim());
    }
    // Only send location text if coordinates are not available
    if (filters.latitude === undefined && filters.longitude === undefined) {
      if (filters.location && filters.location.trim()) {
        params.append('location', filters.location.trim());
      }
    }
    // Always send coordinates if available (preferred over location text)
    if (filters.latitude !== undefined) {
      params.append('latitude', String(filters.latitude));
    }
    if (filters.longitude !== undefined) {
      params.append('longitude', String(filters.longitude));
    }
    if (filters.categoryId && filters.categoryId !== 'all') {
      params.append('categoryId', filters.categoryId);
    }

    const qs = params.toString();
    const res = await apiService.get<DirectoryResponse>(`/directory?${qs}`);
    const items = (res as any).data ?? [];
    const pagination = (res as any).pagination ?? {};

    const total = pagination.totalCount ?? items.length ?? 0;
    const totalPages = pagination.totalPages ?? (limit ? Math.ceil(total / limit) : undefined);

    return {
      items,
      total,
      page: pagination.page ?? page,
      limit: pagination.limit ?? limit,
      totalPages,
      hasNextPage: pagination.hasNextPage ?? (totalPages ? (pagination.page ?? page) < totalPages : undefined),
      hasPreviousPage:
        pagination.hasPreviousPage ?? (totalPages ? (pagination.page ?? page) > 1 : undefined),
    };
  }
}

export const directoryService = new DirectoryService();

