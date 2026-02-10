import { apiService } from './api';

export interface PerformanceMetric {
  id: string;
  name: string;
  code: string;
  description?: string;
  dataType: string;
  config?: Record<string, any> | null;
}

export interface OptedServiceMetric {
  id: string;
  metricId: string;
  required: boolean;
  performanceMetric: PerformanceMetric;
}

export interface OptedMetricsResponse {
  status: string;
  message: string;
  data: OptedServiceMetric[];
}

class ServiceMetricService {
  async getOptedMetrics(serviceId: string): Promise<OptedMetricsResponse> {
    return apiService.get<OptedMetricsResponse>(`/service-metric/opted/${serviceId}`);
  }
}

export const serviceMetricService = new ServiceMetricService();

