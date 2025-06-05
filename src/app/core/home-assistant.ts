import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HomeAssistant {
  private readonly headers = new HttpHeaders({
    Authorization: `Bearer ${environment.token}`,
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) {}

  getState(entityId: string): Observable<any> {
    return this.http.get(`/api/states/${entityId}`, { headers: this.headers });
  }

  callService(domain: string, service: string, entityId: string): Observable<any> {
    return this.http.post(
      `/api/services/${domain}/${service}`,
      { entity_id: entityId },
      { headers: this.headers }
    );
  }
}
