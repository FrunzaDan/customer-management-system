export interface GenericResponse<T> {
  status: number;
  responseMessage: string;
  data?: T;
}
