import { apiService } from './api';

type StatName =
  | 'totalServices'
  | 'totalBatches'
  | 'totalBookings'
  | 'activeBookings'
  | 'totalStudents'
  | 'totalOrders'
  | 'totalRevenue'
  | string;

export interface StatItem {
  name: StatName;
  value: number;
}

export interface StatsResponse {
  status: string;
  data: StatItem[];
}

class StatsService {
  async getStats(): Promise<StatItem[]> {
    const res = await apiService.get<StatsResponse>('/stats');
    return res.data;
  }

  async getStatMap(): Promise<Record<StatName, number>> {
    const list = await this.getStats();
    return list.reduce<Record<StatName, number>>((acc, item) => {
      acc[item.name] = item.value ?? 0;
      return acc;
    }, {} as Record<StatName, number>);
  }
}

export const statsService = new StatsService();

