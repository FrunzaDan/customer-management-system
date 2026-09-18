import { GenericResponse } from './generic-response';

export interface LoginData {
  accessToken: string;
  validUntil: string;
}

export interface LoginDataResponse extends GenericResponse<LoginData> {}
