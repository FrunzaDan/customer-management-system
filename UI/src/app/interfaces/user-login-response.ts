import { IsoDateTime } from './iso-date';

export interface LoginData {
  accessToken: string;
  validUntil: IsoDateTime;
}
