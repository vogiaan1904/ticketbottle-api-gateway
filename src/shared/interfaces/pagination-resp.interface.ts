export interface IPaginationResponse {
  total: number;
  lastPage: number;
  currentPage: number;
  perPage: number;
}

export interface GetPaginationResponse<T> {
  data: T[];
  meta: IPaginationResponse;
}
