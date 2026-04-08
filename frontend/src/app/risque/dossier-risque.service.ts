import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RisqueCategory = 'ENGAGEMENT' | 'PATRIMOINE' | 'GARANTIE_HYPOTHEQUE' | 'GARANTIE_NANTISSEMENT' | 'GARANTIE_CAUTION';

export interface RisqueItem<TPayload extends Record<string, any> = Record<string, any>> {
  id: number;
  dossierId: number;
  category: RisqueCategory;
  payload: TPayload;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class DossierRisqueService {
  private baseUrl = '/api/contentieux/dossiers';

  constructor(private http: HttpClient) {}

  list<TPayload extends Record<string, any>>(dossierId: number, category: RisqueCategory): Observable<RisqueItem<TPayload>[]> {
    return this.http.get<RisqueItem<TPayload>[]>(`${this.baseUrl}/${dossierId}/risque/${category}`);
  }

  create<TPayload extends Record<string, any>>(dossierId: number, category: RisqueCategory, payload: TPayload): Observable<RisqueItem<TPayload>> {
    return this.http.post<RisqueItem<TPayload>>(`${this.baseUrl}/${dossierId}/risque/${category}`, { payload });
  }

  update<TPayload extends Record<string, any>>(dossierId: number, category: RisqueCategory, itemId: number, payload: TPayload): Observable<RisqueItem<TPayload>> {
    return this.http.put<RisqueItem<TPayload>>(`${this.baseUrl}/${dossierId}/risque/${category}/${itemId}`, { payload });
  }

  delete(dossierId: number, category: RisqueCategory, itemId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${dossierId}/risque/${category}/${itemId}`);
  }
}

