import { apiService } from './api';

export interface EvaluationItemPayload {
  metricId: string;
  value: number | string;
  dataType: string;
}

export interface EvaluateStudentPayload {
  enrollmentId: string;
  evaluations: EvaluationItemPayload[];
  remarks: string;
}

export interface EvaluateStudentResponse {
  status: string;
  message: string;
}

class EvaluationService {
  async evaluateStudent(
    studentId: string,
    serviceId: string,
    body: EvaluateStudentPayload,
  ): Promise<EvaluateStudentResponse> {
    return apiService.post<EvaluateStudentResponse>(
      `/evaluate/student/${studentId}/service/${serviceId}`,
      body,
    );
  }
}

export const evaluationService = new EvaluationService();

