export interface PagedResponse<T> {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  items: T[];
}
