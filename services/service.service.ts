import { apiService } from './api';
import {
  VendorService,
  VendorServicesResponse,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceResponse,
  DeleteServiceResponse,
  StudentServicesResponse,
  StudentOrdersResponse,
} from '@/types/service';

/**
 * Service for managing vendor services (CRUD operations).
 */
class ServiceService {
  /**
   * Get all services for a specific user (vendor).
   */
  async getServicesByUserId(userId: string): Promise<VendorServicesResponse> {
    return apiService.get<VendorServicesResponse>(`/services/user/${userId}`);
  }

  /**
   * Get a single service by ID.
   */
  async getServiceById(serviceId: string): Promise<ServiceResponse> {
    return apiService.get<ServiceResponse>(`/services/${serviceId}`);
  }

  /**
   * Create a new service.
   */
  async createService(data: CreateServiceRequest): Promise<ServiceResponse> {
    return apiService.post<ServiceResponse>('/services', data);
  }

  /**
   * Update an existing service.
   */
  async updateService(
    serviceId: string,
    data: UpdateServiceRequest
  ): Promise<ServiceResponse> {
    return apiService.put<ServiceResponse>(`/services/${serviceId}`, data);
  }

  /**
   * Delete a service.
   */
  async deleteService(serviceId: string): Promise<DeleteServiceResponse> {
    return apiService.delete<DeleteServiceResponse>(`/services/${serviceId}`);
  }

  /**
   * Get services a student is enrolled in.
   * Backend endpoint: GET /services/student/:id
   */
  async getStudentServices(studentId: string): Promise<StudentServicesResponse> {
    return apiService.get<StudentServicesResponse>(`/services/student/${studentId}`);
  }

  /**
   * Get all orders for a student.
   * Backend endpoint: GET /orders/student/:studentId
   */
  async getStudentOrders(studentId: string): Promise<StudentOrdersResponse> {
    return apiService.get<StudentOrdersResponse>(`/orders/student/${studentId}`);
  }
}

export const serviceService = new ServiceService();
