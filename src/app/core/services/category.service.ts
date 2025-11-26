import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../models/category.model';
import { environment } from '../../../environments/environment';
import { resolveBackendBase } from '../utils/backend';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly apiUrl: string;

  constructor(private readonly http: HttpClient) {
    const base = resolveBackendBase(environment.backendApiUrl || environment.apiUrl);
    this.apiUrl = `${base}/api/categories`;
  }

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  create(category: Omit<Category, '_id' | 'createdAt'>): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category);
  }
}
