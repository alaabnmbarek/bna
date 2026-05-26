import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type PrestataireType = 'HUISSIER' | 'AVOCAT' | 'EXPERT' | 'NOTAIRE';
export type MissionStatus = 'ASSIGNEE' | 'EN_COURS' | 'TERMINEE' | 'ECHOUEE' | 'ANNULEE';
export type NatureJuridique = 'PERSONNE_PHYSIQUE' | 'PERSONNE_MORALE';
export type MissionType = 'MISSION_ASSIGNATION' | 'MISSION_RECOUVREMENT_JUDICIAIRE' | 'MISSION_SIGNIFICATION' | 'MISSION_EXPERTISE';
export type MissionResultStatus = 'EN_COURS' | 'TERMINEE' | 'ECHOUEE';

export interface Prestataire {
  id: number;
  type: PrestataireType;
  nom: string;
  prenom?: string;
  cabinet?: string;
  numeroCompte?: string;
  matriculeFiscale?: string;
  natureJuridique?: NatureJuridique | null;
  pttNomBanque?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  specialites?: string;
  tarifs?: string;
  disponibilites?: string;
  experienceAvocat?: number | null;
  actif: boolean;
  noteMoyenne?: number | null;
  missionsTotal?: number;
  missionsTerminees?: number;
  createdAt?: string;
}

export interface Mission {
  id: number;
  prestataireId: number;
  typeMission?: MissionType | null;
  codeMission?: string | null;
  titre: string;
  description?: string;
  dossierReference?: string;
  procedureId?: number | null;
  procedureType?: string | null;
  affaireNumero?: string | null;
  procedureTribunal?: string | null;
  dureeEstimee?: number | null;
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

export interface MissionResult {
  id: number;
  missionId: number;
  statut: MissionResultStatus;
  dateDebut?: string | null;
  dateFin?: string | null;
  resultat?: string | null;
  montantRecuperee?: number | null;
  hasPreuve?: boolean;
  preuveFileName?: string | null;
  preuveContentType?: string | null;
  createdAt?: string | null;
}

export interface CreateNoteHonoraireRequest {
  dossierId: number;
  montantHonoraires: number;
  fraisAdministratifs: number;
  dateEmission?: string;
  statut?: string;
  remarques?: string;
  prestations?: Array<{ type: string; description: string; montant: number }>;
}

export interface NoteHonoraire {
  id: number;
  prestataireId: number;
  dossierId: number;
  dossierReference?: string | null;
  dossierObjet?: string | null;
  compteActuel?: string | null;
  agence?: string | null;
  montantEngage?: number | null;
  montantHonoraires: number;
  fraisAdministratifs: number;
  tva: number;
  total: number;
  dateEmission?: string;
  statut?: string;
  remarques?: string;
  prestations?: Array<{ type: string; description: string; montant: number }>;
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

  deletePrestataire(id: number): Observable<void> {
    return this.http.delete<void>(`${this.prestatairesUrl}/${id}/purge`);
  }

  listMissions(prestataireId: number): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.prestatairesUrl}/${prestataireId}/missions`);
  }

  listAllMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(this.missionsUrl);
  }

  listMyMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.missionsUrl}/my`);
  }

  createMission(prestataireId: number, payload: Partial<Mission>): Observable<Mission> {
    return this.http.post<Mission>(`${this.prestatairesUrl}/${prestataireId}/missions`, payload);
  }

  updateMission(missionId: number, payload: Partial<Mission>): Observable<Mission> {
    return this.http.patch<Mission>(`${this.missionsUrl}/${missionId}`, payload);
  }

  getMissionResult(missionId: number): Observable<MissionResult | null> {
    return this.http.get<MissionResult | null>(`${this.missionsUrl}/${missionId}/result`);
  }

  upsertMissionResult(missionId: number, payload: Partial<MissionResult>): Observable<MissionResult> {
    return this.http.post<MissionResult>(`${this.missionsUrl}/${missionId}/result`, payload);
  }

  uploadMissionProof(missionId: number, file: File): Observable<MissionResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MissionResult>(`${this.missionsUrl}/${missionId}/result/proof`, form);
  }

  downloadMissionProof(missionId: number): Observable<Blob> {
    return this.http.get(`${this.missionsUrl}/${missionId}/result/proof`, { responseType: 'blob' });
  }

  getMyPrestataire(): Observable<Prestataire> {
    return this.http.get<Prestataire>(`${this.prestatairesUrl}/me`);
  }

  listMyDossiers(): Observable<Array<{ id: number; reference: string; nomDebiteur: string; statut: string }>> {
    return this.http.get<Array<{ id: number; reference: string; nomDebiteur: string; statut: string }>>(`${this.prestatairesUrl}/me/dossiers`);
  }



  createNoteHonoraire(prestataireId: number, payload: CreateNoteHonoraireRequest): Observable<NoteHonoraire> {
    return this.http.post<NoteHonoraire>(`${this.prestatairesUrl}/${prestataireId}/notes-honoraires`, payload);
  }

  listNotesHonoraires(prestataireId: number): Observable<NoteHonoraire[]> {
    return this.http.get<NoteHonoraire[]>(`${this.prestatairesUrl}/${prestataireId}/notes-honoraires`);
  }
}
