import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ContentieuxStatus = 'A_VALIDER' | 'OUVERT' | 'AFFECTE' | 'CHANGEMENT_COMPTE' | 'CLOTURE' | 'REOUVERT';

export interface DossierContentieux {
  id: number;
  reference: string;
  statut: ContentieuxStatus;
  objet?: string | null;
  nomDebiteur?: string | null;
  compteActuel?: string | null;
  ancienCompte?: string | null;
  agence?: string | null;
  chargeDossier?: string | null;
  chargeDossierId?: number | null;
  dateOuverture?: string | null;
  montantEngage?: number | null;
  montantRecupere?: number | null;
  montantHonoraires?: number | null;
  fraisAdministratifs?: number | null;
  observationsAdministratives?: string | null;
  observationsFinancieres?: string | null;
  dateCloture?: string | null;
  motifCloture?: string | null;
  createdBy?: string | null;
  validatedBy?: string | null;
  validatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateDossierRequest {
  objet?: string;
  nomDebiteur?: string;
  compteActuel?: string;
  ancienCompte?: string;
  agence?: string;
  chargeDossier?: string;
  chargeDossierId?: number | null;
  dateOuverture?: string;
  montantEngage?: number | string;
  montantRecupere?: number | string;
  observationsAdministratives?: string;
  observationsFinancieres?: string;
}

export interface ChargeDossierOption {
  id: number;
  username: string;
  fullName: string | null;
  label: string;
}

export type AffaireStatut = 'EN_COURS' | 'TERMINEE' | 'EN_ATTENTE';

export interface AffaireContentieux {
  id: number;
  dossierId: number;
  dossierReference: string;
  numeroAffaire?: string | null;
  typeAffaire: string;
  description?: string | null;
  statut: AffaireStatut;
  dateCreation: string;
}

export interface CreateAffaireRequest {
  numeroAffaire?: string;
  typeAffaire: string;
  description?: string;
  statut: AffaireStatut;
  dateCreation: string;
}

@Injectable({ providedIn: 'root' })
export class ContentieuxService {
  private url = '/api/contentieux/dossiers';

  constructor(private http: HttpClient) {}

  list(): Observable<DossierContentieux[]> {
    return this.http.get<DossierContentieux[]>(this.url);
  }

  listChargesDossiers(): Observable<ChargeDossierOption[]> {
    return this.http.get<ChargeDossierOption[]>(`${this.url}/charges-dossiers`);
  }

  create(payload: CreateDossierRequest): Observable<DossierContentieux> {
    return this.http.post<DossierContentieux>(this.url, payload);
  }

  update(id: number, payload: CreateDossierRequest): Observable<DossierContentieux> {
    return this.http.patch<DossierContentieux>(`${this.url}/${id}`, payload);
  }

  validate(id: number): Observable<DossierContentieux> {
    return this.http.patch<DossierContentieux>(`${this.url}/${id}/validate`, {});
  }

  assign(id: number, payload: { chargeDossierId?: number | null; chargeDossier?: string | null }): Observable<DossierContentieux> {
    return this.http.patch<DossierContentieux>(`${this.url}/${id}/assign`, payload);
  }

  changeAccount(id: number, nouveauCompte: string): Observable<DossierContentieux> {
    return this.http.patch<DossierContentieux>(`${this.url}/${id}/change-account`, { nouveauCompte });
  }

  close(id: number, payload: { dateCloture?: string; motifCloture?: string }): Observable<DossierContentieux> {
    return this.http.patch<DossierContentieux>(`${this.url}/${id}/close`, payload);
  }

  reopen(id: number): Observable<DossierContentieux> {
    return this.http.patch<DossierContentieux>(`${this.url}/${id}/reopen`, {});
  }

  remove(id: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.url}/${id}`);
  }

  listAffaires(dossierId: number): Observable<AffaireContentieux[]> {
    return this.http.get<AffaireContentieux[]>(`${this.url}/${dossierId}/affaires`);
  }

  createAffaire(dossierId: number, payload: CreateAffaireRequest): Observable<AffaireContentieux> {
    return this.http.post<AffaireContentieux>(`${this.url}/${dossierId}/affaires`, payload);
  }
}
