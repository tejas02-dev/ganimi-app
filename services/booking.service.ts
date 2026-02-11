import { apiService } from './api';

/** Shape returned by GET /bookings/my-bookings */
export interface MyBookingItem {
  bookingId: string;
  bookingDate: string;
  status: string;
  serviceName?: string | null;
  /** Price as string e.g. "1000.00" */
  servicePrice?: string | null;
  studentName?: string | null;
  notes?: string | null;
}

export interface MyBookingsResponse {
  status: string;
  message: string;
  data: MyBookingItem[];
}

class BookingService {
  async getMyBookings(): Promise<MyBookingsResponse> {
    return apiService.get<MyBookingsResponse>('/bookings/my-bookings');
  }
}

export const bookingService = new BookingService();
