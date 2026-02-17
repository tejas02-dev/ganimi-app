import { apiService } from './api';
import { CategoriesResponse, Category, StudentCategory } from '@/types/category';

class CategoryService {
  async getCategories(): Promise<Category[]> {
    const response = await apiService.get<CategoriesResponse>('/categories');
    return response.data;
  }

  /**
   * Get a category by its ID (used for vendor's fixed category).
   * Backend endpoint: GET /categories/:id
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await apiService.get<{ status: string; data: Category }>(`/categories/${id}`);
    return response.data;
  }

  /**
   * Get categories available to the logged-in student.
   * Backend endpoint: GET /student/categories
   */
  async getStudentCategories(): Promise<StudentCategory[]> {
    const response = await apiService.get<{ status: string; message: string; data: StudentCategory[] }>(
      '/student/categories'
    );
    return response.data;
  }

  /**
   * Check if student has access to a category.
   * Backend endpoint: GET /student/category/:id
   */
  async checkStudentCategoryAccess(categoryId: string): Promise<boolean> {
    const response = await apiService.get<{ status: string; access: boolean }>(
      `/student/category/${categoryId}`
    );
    return response.access === true;
  }
}

export const categoryService = new CategoryService();
