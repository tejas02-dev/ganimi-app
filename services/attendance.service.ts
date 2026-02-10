import { apiService } from './api';

export type AttendanceStatus = 'present' | 'absent' | 'not_marked' | string;

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface AttendanceData {
  attendanceList: AttendanceRecord[];
  startDate: string;
  endDate: string;
}

export interface AttendanceResponse {
  status: string;
  message: string;
  data: AttendanceData;
}

export interface AttendanceByDateItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentProfilePicture?: string | null;
  todaysAttendance?: {
    date: string;
    status: AttendanceStatus;
    remarks?: string | null;
  } | null;
}

export interface AttendanceByDateResponse {
  status: string;
  message: string;
  data: AttendanceByDateItem[];
}

export interface MarkAttendanceRequest {
  date: string; // YYYY-MM-DD
  studentId: string;
  status: AttendanceStatus;
}

export interface MarkAttendanceResponse {
  status: string;
  message: string;
}

class AttendanceService {
  async getAttendanceForStudent(batchId: string, studentId: string): Promise<AttendanceResponse> {
    return apiService.get<AttendanceResponse>(`/attendance/batch/${batchId}/student/${studentId}`);
  }

  async getAttendanceByDate(batchId: string, date: string): Promise<AttendanceByDateResponse> {
    return apiService.get<AttendanceByDateResponse>(
      `/attendance/batch/${batchId}/date/${date}`,
    );
  }

  async markAttendance(
    batchId: string,
    body: MarkAttendanceRequest,
  ): Promise<MarkAttendanceResponse> {
    return apiService.put<MarkAttendanceResponse>(`/attendance/batch/${batchId}/mark`, body);
  }
}

export const attendanceService = new AttendanceService();

