import { apiService } from '@/services/api';

// Course created by vendor (list item)
export interface VendorCourse {
  id: string;
  title: string;
  description?: string;
  authorId?: string;
  tenantId?: string;
  createdAt?: string;
}

export interface VendorCoursesResponse {
  status: string;
  message: string;
  data: VendorCourse[];
}

export interface CreateCoursePayload {
  title: string;
  description?: string;
}

export interface CreateCourseResponse {
  status: string;
  message: string;
  data: VendorCourse;
}

// Basic course info when listing courses by service
export interface ServiceCourse {
  id: string;
  title: string;
  serviceIds: string[];
  batchIds: string[];
}

export interface CoursesByServiceResponse {
  status: string;
  message: string;
  data: ServiceCourse[];
}

// Course player (Udemy-like) structures
export type CourseContentType = 'video' | 'article' | string;

export interface CourseContent {
  id: string;
  title: string;
  description?: string;
  contentType: CourseContentType;
  videoEmbedHtml?: string | null;
  videoUrl?: string | null;
  provider?: string | null;
   articleText?: string | null;
}

export interface CourseTopicContentMap {
  id: string;
  sequence: number;
  contentId: string;
  content: CourseContent;
}

export interface CourseTopic {
  id: string;
  title: string;
  sequence: number;
  contents: CourseTopicContentMap[];
}

export interface CourseLesson {
  id: string;
  title: string;
  sequence: number;
  topics: CourseTopic[];
}

export interface CoursePlayerData {
  id: string;
  title: string;
  lessons: CourseLesson[];
}

export interface CoursePlayerResponse {
  status: string;
  message: string;
  data: CoursePlayerData;
}

// Full course from GET /courses/:id (with lessons structure)
export interface CourseDetailData {
  id: string;
  title: string;
  description?: string;
  lessons?: CourseLesson[];
}

export interface CourseDetailResponse {
  status: string;
  message: string;
  data: CourseDetailData;
}

class CourseService {
  async getMyCourses(): Promise<VendorCoursesResponse> {
    return apiService.get<VendorCoursesResponse>('/courses');
  }

  async createCourse(payload: CreateCoursePayload): Promise<CreateCourseResponse> {
    return apiService.post<CreateCourseResponse>('/courses', payload);
  }

  async getCoursesForService(serviceId: string): Promise<CoursesByServiceResponse> {
    return apiService.get<CoursesByServiceResponse>(`/courses/service/${serviceId}`);
  }

  async getCourseById(courseId: string): Promise<CourseDetailResponse> {
    return apiService.get<CourseDetailResponse>(`/courses/${courseId}`);
  }

  async getCoursePlayer(courseId: string): Promise<CoursePlayerResponse> {
    return apiService.get<CoursePlayerResponse>(`/courses/${courseId}/player`);
  }

  async deleteCourse(courseId: string): Promise<{ status: string; message: string }> {
    return apiService.delete<{ status: string; message: string }>(`/courses/${courseId}`);
  }

  async createLesson(courseId: string, payload: { title: string; sequence?: number }): Promise<{
    status: string;
    message: string;
    data: { id: string; courseId: string; title: string; sequence: number; createdAt: string };
  }> {
    return apiService.post(`/courses/${courseId}/lessons`, payload);
  }

  async updateLesson(lessonId: string, payload: { title?: string; sequence?: number }): Promise<{
    status: string;
    message: string;
  }> {
    return apiService.put(`/courses/lessons/${lessonId}`, payload);
  }

  async deleteLesson(lessonId: string): Promise<{ status: string; message: string }> {
    return apiService.delete(`/courses/lessons/${lessonId}`);
  }

  async createTopic(lessonId: string, payload: { title: string; sequence?: number }): Promise<{
    status: string;
    message: string;
    data: { id: string; lessonId: string; title: string; sequence: number; createdAt: string };
  }> {
    return apiService.post(`/courses/lessons/${lessonId}/topics`, payload);
  }

  async updateTopic(topicId: string, payload: { title?: string; sequence?: number }): Promise<{
    status: string;
    message: string;
  }> {
    return apiService.put(`/courses/topics/${topicId}`, payload);
  }

  async deleteTopic(topicId: string): Promise<{ status: string; message: string }> {
    return apiService.delete(`/courses/topics/${topicId}`);
  }

  async attachContentToTopic(
    topicId: string,
    payload: { contentId: string; sequence: number }
  ): Promise<{ status: string; message: string }> {
    return apiService.post(`/courses/topics/${topicId}/contents`, payload);
  }

  async detachContentFromTopic(
    topicId: string,
    contentId: string
  ): Promise<{ status: string; message: string }> {
    return apiService.delete(`/courses/topics/${topicId}/contents/${contentId}`);
  }

  async updateCourseVisibility(
    courseId: string,
    payload: { accessScope: 'service' | 'batch'; serviceIds: string[]; batchIds: string[] }
  ): Promise<{ status: string; message: string }> {
    return apiService.put(`/courses/${courseId}/visibility`, payload);
  }
}

export const courseService = new CourseService();

