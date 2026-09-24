export interface GenericResponse<T> {
  status: number;
  responseMessage: string | null;
  data: T | null;
}
