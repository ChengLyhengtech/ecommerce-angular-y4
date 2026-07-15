import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponseDto, UserCreateAdminDto, UserUpdateRoleDto, UserBanDto } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private adminApiUrl = `${environment.apiUrl}/api/admin/users`;

  getUsers(pageNumber: number = 1, pageSize: number = 10): Observable<UserResponseDto[]> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());
    return this.http.get<UserResponseDto[]>(this.adminApiUrl, { params });
  }

  createUser(data: UserCreateAdminDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.adminApiUrl, data);
  }

  updateUserRole(id: string, role: string): Observable<{ message: string }> {
    const body: UserUpdateRoleDto = { role };
    return this.http.put<{ message: string }>(`${this.adminApiUrl}/${id}/role`, body);
  }

  banUser(id: string, banData: UserBanDto): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.adminApiUrl}/${id}/ban`, banData);
  }
}
