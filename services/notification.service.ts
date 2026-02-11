import { apiService } from './api';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  targetScope: string;
  type: string;
  createdAt: string;
}

export interface MyNotificationsResponse {
  status: string;
  message: string;
  data: NotificationItem[];
}

export type NotificationType = 'info' | 'alert' | 'event';
export type TargetScope = 'all' | 'service' | 'batch';

export interface CreateNotificationPayload {
  title: string;
  message: string;
  targetScope: TargetScope;
  targetIds: string[];
  type: NotificationType;
}

export interface CreateNotificationResponse {
  status: string;
  message: string;
  data: { id: string; title: string; targetScope: string; type: string; createdAt: string };
}

class NotificationService {
  async getMyNotifications(): Promise<MyNotificationsResponse> {
    return apiService.get<MyNotificationsResponse>('/notification/my');
  }

  async createNotification(payload: CreateNotificationPayload): Promise<CreateNotificationResponse> {
    return apiService.post<CreateNotificationResponse>('/notification', payload);
  }
}

export const notificationService = new NotificationService();
