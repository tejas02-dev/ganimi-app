export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  createdBy: string;
  createdByRole: string;
  targetScope: string;
  type: string;
  createdAt: string;
}

export interface NotificationsResponse {
  status: string;
  message: string;
  data: NotificationItem[];
}

