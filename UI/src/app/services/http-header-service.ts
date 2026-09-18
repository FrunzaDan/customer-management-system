import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { SessionStorageService } from '../services/session-storage.service';

@Injectable({
  providedIn: 'root',
})
export class HttpHeaderService {
  constructor(private sessionStorageService: SessionStorageService) {}

  getHeadersWithTokenSet(): HttpHeaders {
    const token = this.sessionStorageService.getSessionAccessToken();
    let headers = new HttpHeaders().set('Content-Type', 'application/json');

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }
}
