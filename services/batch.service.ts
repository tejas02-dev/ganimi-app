import { apiService } from './api';

export interface ServiceBatch {
  id: string;
  name: string;
  daysOfWeek?: string;
  startTime?: string;
  endTime?: string;
  studentCount?: number;
  ageGroup?: string;
  price?: number | string;
  capacity?: number | string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface BatchesByServiceResponse {
  status: string;
  message: string;
  data: ServiceBatch[];
}

export interface BatchByIdResponse {
  status: string;
  message: string;
  data: ServiceBatch;
}

export interface CreateBatchPayload {
  serviceId: string;
  name: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  ageGroup: string;
  price: number;
  capacity: number;
  startDate: string;
  endDate: string;
}

export interface UpdateBatchPayload {
  name?: string;
  daysOfWeek?: string;
  startTime?: string;
  endTime?: string;
  ageGroup?: string;
  price?: number;
  capacity?: number;
  startDate?: string;
  endDate?: string;
}

class BatchService {
  async getBatchById(batchId: string): Promise<BatchByIdResponse> {
    return apiService.get<BatchByIdResponse>(`/batches/${batchId}`);
  }

  async getBatchesForService(serviceId: string): Promise<BatchesByServiceResponse> {
    return apiService.get<BatchesByServiceResponse>(`/batches/service/${serviceId}`);
  }

  async createBatch(payload: CreateBatchPayload) {
    return apiService.post('/batches', payload);
  }

  async updateBatch(batchId: string, payload: UpdateBatchPayload) {
    return apiService.put(`/batches/${batchId}`, payload);
  }

  async deleteBatch(batchId: string) {
    return apiService.delete(`/batches/${batchId}`);
  }
}

export const batchService = new BatchService();


