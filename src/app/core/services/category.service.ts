import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly apiUrl = '/api/categories';

  constructor(private http: HttpClient) {}

  /**
   * Get all active categories
   */
  async list(): Promise<Category[]> {
    return await lastValueFrom(
      this.http.get<Category[]>(this.apiUrl)
    );
  }

  /**
   * Create a new category (optional - for admin)
   */
  async create(category: Partial<Category>): Promise<Category> {
    return await lastValueFrom(
      this.http.post<Category>(this.apiUrl, category)
    );
  }

  /**
   * Get categories as Observable (for reactive forms)
   */
  list$(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }
}
