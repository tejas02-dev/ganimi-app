import { apiService } from './api';
import type { NotificationsResponse } from '@/types/notification';

class NotificationService {
  /**
   * Get notifications for the authenticated user.
   * Backend endpoint: GET /notification/my
   */
  async getMyNotifications(): Promise<NotificationsResponse> {
    return apiService.get<NotificationsResponse>('/notification/my');
  }
}

export const notificationService = new NotificationService();

