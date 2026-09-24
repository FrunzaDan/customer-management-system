import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { LoginData } from '../interfaces/user-login-response';
import { UserLoginRequest } from '../interfaces/user-login-request';
import { environment } from '../../environments/environment';
import { SessionStorageService } from './session-storage.service';
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
  private readonly API_URL = `${environment.apiUrl}/api/authentication/access-token`;

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly notificationService = inject(NotificationService);

  login(
    userLoginRequest: UserLoginRequest,
  ): Observable<GenericResponse<LoginData>> {
    return this.http.post<GenericResponse<LoginData>>(
      this.API_URL,
      userLoginRequest,
    );
  }

  // Keys off response.status, not the response message text — comparing against a
  // literal success string ("Success!") would silently break if that wording ever
  // changed on either side of the API/UI boundary.
  checkCredentials(
    response: GenericResponse<LoginData>,
  ): CredentialsCheckResult {
    const success =
      response.data?.accessToken != null && response.status === 200;
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
