import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PrestataireType = 'HUISSIER' | 'AVOCAT' | 'EXPERT' | 'NOTAIRE';
export type MissionStatus = 'ASSIGNEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';

export interface Prestataire {
  id: number;
  type: PrestataireType;
  nom: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  specialites?: string;
  tarifs?: string;
  disponibilites?: string;
  actif: boolean;
  noteMoyenne?: number | null;
  missionsTotal?: number;
  missionsTerminees?: number;
  createdAt?: string;
}

export interface Mission {
  id: number;
  prestataireId: number;
  titre: string;
  description?: string;
  dossierReference?: string;
  statut: MissionStatus;
  dateDebut?: string;
  dateEcheance?: string;
  dateFin?: string;
  assigneeParUsername?: string;
  notePerformance?: number | null;
  commentairePerformance?: string;
  cout?: number | null;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class PrestatairesService {
  private prestatairesUrl = '/api/prestataires';
  private missionsUrl = '/api/missions';

  constructor(private http: HttpClient) {}

  listPrestataires(filters?: { type?: PrestataireType; q?: string; actif?: boolean }): Observable<Prestataire[]> {
    let params = new HttpParams();
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.q) params = params.set('q', filters.q);
    if (filters?.actif !== undefined) params = params.set('actif', String(filters.actif));
    return this.http.get<Prestataire[]>(this.prestatairesUrl, { params });
  }

  getPrestataire(id: number): Observable<Prestataire> {
    return this.http.get<Prestataire>(`${this.prestatairesUrl}/${id}`);
  }

  createPrestataire(payload: Partial<Prestataire>): Observable<Prestataire> {
    return this.http.post<Prestataire>(this.prestatairesUrl, payload);
  }

  updatePrestataire(id: number, payload: Partial<Prestataire>): Observable<Prestataire> {
    return this.http.put<Prestataire>(`${this.prestatairesUrl}/${id}`, payload);
  }

  deactivatePrestataire(id: number): Observable<void> {
    return this.http.delete<void>(`${this.prestatairesUrl}/${id}`);
  }

  listMissions(prestataireId: number): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.prestatairesUrl}/${prestataireId}/missions`);
  }

  createMission(prestataireId: number, payload: Partial<Mission>): Observable<Mission> {
    return this.http.post<Mission>(`${this.prestatairesUrl}/${prestataireId}/missions`, payload);
  }

  updateMission(missionId: number, payload: Partial<Mission>): Observable<Mission> {
    return this.http.patch<Mission>(`${this.missionsUrl}/${missionId}`, payload);
  }
}

