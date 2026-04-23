import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NoteHonorairePrestation {
  type: string;
  description: string;
  montant: number;
}

export interface NoteHonoraire {
  id?: number;
  numero: string;
  prestataireId: number;
  prestataireNom: string;
  dossierId: number;
  dossierReference: string;
  compteActuel?: string;
  agence?: string;
  montantEngage?: number;
  typeLien: 'DOSSIER' | 'AFFAIRE' | 'MISSION';
  referenceLien: string;
  montantHonoraires: number;
  fraisAdministratifs: number;
  tva: number;
  total: number;
  statut: 'EN_COURS' | 'SOUMISE' | 'VALIDEE' | 'REJETEE';
  fichierJustificatif?: string;
  remarques?: string;
  prestations?: NoteHonorairePrestation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateNoteRequest {
  prestataireId?: number;
  dossierId: number;
  typeLien: 'DOSSIER' | 'AFFAIRE' | 'MISSION';
  referenceLien: string;
  montantHonoraires: number;
  fraisAdministratifs: number;
  fichierJustificatif?: string;
  remarques?: string;
  prestations?: NoteHonorairePrestation[];
}

@Injectable({
  providedIn: 'root'
})
export class NoteHonoraireService {
  private apiUrl = '/api/notes-honoraires';

  constructor(private http: HttpClient) {}

  getAll(prestataireId?: number): Observable<NoteHonoraire[]> {
    const url = prestataireId ? `${this.apiUrl}?prestataireId=${prestataireId}` : this.apiUrl;
    return this.http.get<NoteHonoraire[]>(url);
  }

  create(request: CreateNoteRequest): Observable<NoteHonoraire> {
    return this.http.post<NoteHonoraire>(this.apiUrl, request);
  }

  update(id: number, request: CreateNoteRequest): Observable<NoteHonoraire> {
    return this.http.put<NoteHonoraire>(`${this.apiUrl}/${id}`, request);
  }

  submit(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/submit`, {});
  }

  validate(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/validate`, {});
  }

  reject(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/reject`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
