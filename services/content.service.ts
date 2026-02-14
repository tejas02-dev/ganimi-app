import { apiService } from './api';

export type ContentType = 'video' | 'text';

export interface VendorContent {
  id: string;
  title: string;
  description?: string;
  contentType: ContentType | string;
  videoUrl?: string | null;
  videoEmbedHtml?: string | null;
  provider?: string | null;
  articleText?: string | null;
  serviceIds?: string[];
  batchIds?: string[];
  createdAt?: string;
}

export interface CreateContentPayload {
  title: string;
  description: string;
  contentType: 'video' | 'text';
  videoUrl?: string | null;
  provider?: string | null;
  articleText?: string | null;
}

export interface ContentListResponse {
  status: string;
  message: string;
  data: VendorContent[];
}

export interface CreateContentResponse {
  status: string;
  message: string;
  data: VendorContent;
}

export interface UpdateContentResponse {
  status: string;
  message: string;
  data?: VendorContent;
}

class ContentService {
  async getContent(): Promise<ContentListResponse> {
    return apiService.get<ContentListResponse>('/content');
  }

  async createContent(payload: CreateContentPayload): Promise<CreateContentResponse> {
    return apiService.post<CreateContentResponse>('/content', payload);
  }

  async updateContent(
    contentId: string,
    payload: CreateContentPayload
  ): Promise<UpdateContentResponse> {
    return apiService.put<UpdateContentResponse>(`/content/${contentId}`, payload);
  }

  async deleteContent(contentId: string): Promise<{ status: string; message: string }> {
    return apiService.delete<{ status: string; message: string }>(`/content/${contentId}`);
  }
}

export const contentService = new ContentService();
