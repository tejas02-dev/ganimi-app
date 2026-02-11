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
}

export interface SupportListResponse {
  status?: string;
  message?: string;
  data: SupportTicket[];
}

export type TicketType = 'support_request' | 'complaint';
export type Priority = 'low' | 'medium' | 'high';

export interface CreateTicketPayload {
  ticketType: TicketType;
  category: string;
  priority: Priority;
  title: string;
  description: string;
}

export interface CreateTicketResponse {
  status: string;
  message: string;
  data?: SupportTicket;
}

class SupportService {
  async getSupportTickets(): Promise<SupportListResponse> {
    return apiService.get<SupportListResponse>('/support');
  }

  async createTicket(payload: CreateTicketPayload): Promise<CreateTicketResponse> {
    return apiService.post<CreateTicketResponse>('/support', payload);
  }
}

export const supportService = new SupportService();
