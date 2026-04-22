import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Facture {
  id?: number;
  numero: string;
  montantHt: number;
  tva: number;
  montantTtc: number;
  montantPaye: number;
  resteAPayer: number;
  statut: 'EN_COURS' | 'VALIDEE' | 'PAYEE';
  dateFacture: string;
  typeLien: 'DOSSIER' | 'AFFAIRE' | 'MISSION';
  referenceLien: string;
  fichierJustificatif?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FactureImportResponse {
  facture: Facture;
  extracted?: {
    numero?: string;
    dateFacture?: string;
    montantHt?: number;
    tva?: number;
    montantTtc?: number;
    prestataire?: string;
    warnings?: string[];
  };
  fileUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FacturesService {
  private apiUrl = 'http://localhost:8080/api/factures';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Facture[]> {
    return this.http.get<Facture[]>(this.apiUrl);
  }

  getById(id: number): Observable<Facture> {
    return this.http.get<Facture>(`${this.apiUrl}/${id}`);
  }

  create(facture: Facture): Observable<Facture> {
    return this.http.post<Facture>(this.apiUrl, facture);
  }

  update(id: number, facture: Facture): Observable<Facture> {
    return this.http.put<Facture>(`${this.apiUrl}/${id}`, facture);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  importFacture(file: File): Observable<FactureImportResponse> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<FactureImportResponse>(`${this.apiUrl}/import`, form);
  }
}
