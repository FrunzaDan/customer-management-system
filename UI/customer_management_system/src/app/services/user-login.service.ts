import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import {
  LoginData,
  LoginDataResponse,
} from '../../../src/app/interfaces/user-login-response';
import { UserLoginRequest } from '../../../src/app/interfaces/user-login-request';
import { environment } from '../../environments/environment';
import { SessionStorageService } from './session-storage.service';
import { HttpHeaderService } from './http-header-service';
import { GenericResponse } from '../interfaces/generic-response';
import { NotificationService } from './notification.service';

export interface CredentialsCheckResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserLoginService {
  readonly APIURL =
    environment.CustomerManagementSystemAPI +
    '/api/Authentication/access-token';

  constructor(
    private http: HttpClient,
    private router: Router,
    private sessionStorageService: SessionStorageService,
    private httpHeaderService: HttpHeaderService,
    private notificationService: NotificationService,
  ) {}

  login(userLoginRequest: UserLoginRequest): Observable<LoginDataResponse> {
    const headers = this.httpHeaderService.getHeadersWithTokenSet();
    return this.http.post<GenericResponse<LoginData>>(
      this.APIURL,
      userLoginRequest,
      {
        headers: headers,
      },
    );
  }

  // Keys off response.status, not the response message text — comparing against a
  // literal success string ("Success!") would silently break if that wording ever
  // changed on either side of the API/UI boundary.
  checkCredentials(response: LoginDataResponse): CredentialsCheckResult {
    const success = response.data?.accessToken != null && response.status === 200;
    if (success) {
      this.sessionStorageService.setSessionAccessToken(
        response.data!.accessToken,
      );
      this.notificationService.show('Login successful.');
      this.router.navigateByUrl('customers');
    }
    return { success, message: response.responseMessage };
  }
}
