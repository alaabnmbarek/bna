import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FacturePrestation {
  type: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
}

export interface Facture {
  id?: number;
  numero: string;
  montantHt: number;
  tva: number;
  montantTtc: number;
  montantPaye: number;
  resteAPayer: number;
  statut: 'EN_COURS' | 'EN_ATTENTE' | 'VALIDEE' | 'PAYEE' | 'REFUSEE';
  dateFacture: string;
  typeLien: 'DOSSIER' | 'AFFAIRE' | 'MISSION';
  referenceLien: string;
  prestataireId?: number;
  fichierJustificatif?: string;
  remarques?: string;
  conditionsPaiement?: string;
  modePaiement?: string;
  noteHonoraireId?: number;
  prestations?: FacturePrestation[];
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
  private apiUrl = '/api/factures';

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

  downloadFile(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/file`, { responseType: 'blob' });
  }

  uploadFile(id: number, file: File): Observable<Facture> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Facture>(`${this.apiUrl}/${id}/file`, form);
  }
}
