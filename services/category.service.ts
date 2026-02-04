import { apiService } from './api';
import { CategoriesResponse, Category } from '@/types/category';

class CategoryService {
  async getCategories(): Promise<Category[]> {
    const response = await apiService.get<CategoriesResponse>('/categories');
    return response.data;
  }

  async getCategoryById(id: string): Promise<Category> {
    const response = await apiService.get<{ status: string; data: Category }>(`/categories/${id}`);
    return response.data;
  }
}

export const categoryService = new CategoryService();
