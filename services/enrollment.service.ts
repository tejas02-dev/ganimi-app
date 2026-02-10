import { apiService } from './api';

export interface BatchEnrollment {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentProfilePicture?: string | null;
  todaysAttendance?: {
    date: string;
    status: string;
    remarks?: string | null;
  } | null;
  latestEvaluation?: string | null;
}

export interface BatchEnrollmentsResponse {
  status: string;
  message: string;
  data: BatchEnrollment[];
}

export interface EnrollStudentRequest {
  email: string;
  name: string;
  studentPhone: string;
  parentPhone: string;
}

class EnrollmentService {
  async getEnrollmentsByBatch(batchId: string): Promise<BatchEnrollmentsResponse> {
    return apiService.get<BatchEnrollmentsResponse>(`/enrollment/batch/${batchId}`);
  }

  async enrollStudentInBatch(batchId: string, body: EnrollStudentRequest) {
    return apiService.post(`/enrollment/batch/${batchId}`, body);
  }
}

export const enrollmentService = new EnrollmentService();

