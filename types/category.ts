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
