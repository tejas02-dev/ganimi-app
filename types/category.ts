export interface Category {
  id: string;
  name: string;
  description: string;
  price: number;
  sequence: number;
  color: string;
  slug: string;
}

export interface CategoriesResponse {
  status: string;
  message: string;
  data: Category[];
}

// Extended category shape returned from /student/categories
export interface StudentCategory extends Category {
  access?: string;
  enrolled?: number;
  serviceCount?: number;
}
