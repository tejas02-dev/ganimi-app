import { apiService } from './api';

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

class CourseService {
  async getCoursesForService(serviceId: string): Promise<CoursesByServiceResponse> {
    return apiService.get<CoursesByServiceResponse>(`/courses/service/${serviceId}`);
  }

  async getCoursePlayer(courseId: string): Promise<CoursePlayerResponse> {
    return apiService.get<CoursePlayerResponse>(`/courses/${courseId}/player`);
  }
}

export const courseService = new CourseService();

