import { apiService } from './api';

export interface SupportTicketCreatedBy {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface SupportTicket {
  id: string;
  ticketType?: string;
  type?: string;
  category?: string;
  priority?: string;
  title: string;
  description?: string;
  targetRole?: string;
  status?: string;
  /** API may return createdBy as string (id) or object { id, name, email, role } */
  createdBy?: string | SupportTicketCreatedBy;
  createdByName?: string;
  createdAt: string;
  updatedAt?: string;
  messages?: unknown[];
}

export interface SupportListResponse {
  status?: string;
  message?: string;
  data: SupportTicket[];
}

export type TicketType = 'support' | 'complaint';
export type Priority = 'low' | 'medium' | 'high';

export interface CreateTicketPayload {
  type: TicketType;
  category: string;
  priority: Priority;
  title: string;
  description: string;
  targetRole: string;
}

export interface CreateTicketResponse {
  status: string;
  message: string;
  data?: SupportTicket;
}

export interface SupportTicketDetailResponse {
  status?: string;
  message?: string;
  data: SupportTicket;
}

class SupportService {
  async getSupportTickets(): Promise<SupportListResponse> {
    return apiService.get<SupportListResponse>('/support');
  }

  async getSupportTicket(id: string): Promise<SupportTicketDetailResponse> {
    return apiService.get<SupportTicketDetailResponse>(`/support/${id}`);
  }

  async createTicket(payload: CreateTicketPayload): Promise<CreateTicketResponse> {
    return apiService.post<CreateTicketResponse>('/support', payload);
  }
}

export const supportService = new SupportService();
