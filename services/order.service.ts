import { apiService } from './api';

export interface CategoryOrderItem {
  categoryId: string;
  title?: string;
  price: number;
}

export interface CreateCategoryOrderPayload {
  orderItems: CategoryOrderItem[];
}

export interface CreateCategoryOrderResponse {
  status: string;
  orderId: string;
  amount: number;
  key: string;
  categories?: Array<{ categoryId: string; price: number }>;
}

export interface CreateServiceOrderPayload {
  batchId: string;
}

export interface CreateServiceOrderResponse {
  status: string;
  orderId: string;
  amount: number;
  key: string;
}

class OrderService {
  /**
   * Create an order for category access.
   * Backend: POST /orders/category
   * Returns Razorpay order details for checkout.
   */
  async createCategoryOrder(payload: CreateCategoryOrderPayload): Promise<CreateCategoryOrderResponse> {
    const data = await apiService.post<CreateCategoryOrderResponse>('/orders/category', payload);
    return data as CreateCategoryOrderResponse;
  }

  /**
   * Create an order for service/batch enrollment.
   * Backend: POST /orders/service/:serviceId
   * Body: { batchId }. Returns Razorpay order details for checkout.
   */
  async createServiceOrder(
    serviceId: string,
    payload: CreateServiceOrderPayload
  ): Promise<CreateServiceOrderResponse> {
    const data = await apiService.post<CreateServiceOrderResponse>(
      `/orders/service/${serviceId}`,
      payload
    );
    return data as CreateServiceOrderResponse;
  }
}

export const orderService = new OrderService();
