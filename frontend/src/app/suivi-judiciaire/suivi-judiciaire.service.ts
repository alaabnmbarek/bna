import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ProcedureType = 'ASSIGNATION' | 'INJONCTION_DE_PAYER' | 'SAISIE_ARRET' | 'SAISIE_IMMOBILIERE' | 'SAISIE_MOBILIERE' | 'APPEL' | 'CASSATION';
export type AffaireStatus = 'EN_COURS' | 'JUGEE' | 'CLOTUREE' | 'SUSPENDUE';
export type AudienceStatus = 'PROGRAMMEE' | 'REALISEE' | 'REPORTEE' | 'ANNULEE';
export type DecisionType = 'GAIN' | 'PERTE' | 'REPORT' | 'EXECUTION' | 'RADIATION' | 'NON_LIEU';

export interface AffaireJudiciaire {
  id?: number;
  dossierId: number;
  dossierReference?: string;
  nomDebiteur?: string;
  referenceTribunal: string;
  typeProcedure: ProcedureType;
  statut?: AffaireStatus;
  tribunal: string;
  dateOuverture: string;
  avocatId?: number;
  avocatNom?: string;
  huissierId?: number;
  huissierNom?: string;
  observations?: string;
}

export interface Audience {
  id?: number;
  affaireId: number;
  referenceTribunal?: string;
  dateAudience: string;
  objet: string;
  compteRendu?: string;
  statut?: AudienceStatus;
}

export interface Jugement {
  id?: number;
  affaireId: number;
  dateJugement: string;
  typeDecision: DecisionType;
  montantRecupere?: number;
  observations?: string;
  documentUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SuiviJudiciaireService {
  private url = '/api/suivi-judiciaire';

  constructor(private http: HttpClient) {}

  getAllAffaires(): Observable<AffaireJudiciaire[]> {
    return this.http.get<AffaireJudiciaire[]>(`${this.url}/affaires`);
  }

  getAffairesByDossier(dossierId: number): Observable<AffaireJudiciaire[]> {
    return this.http.get<AffaireJudiciaire[]>(`${this.url}/dossier/${dossierId}`);
  }

  createAffaire(payload: AffaireJudiciaire): Observable<AffaireJudiciaire> {
    return this.http.post<AffaireJudiciaire>(`${this.url}/affaires`, payload);
  }

  scheduleAudience(payload: Audience): Observable<Audience> {
    return this.http.post<Audience>(`${this.url}/audiences`, payload);
  }

  updateAudience(id: number, payload: Audience): Observable<Audience> {
    return this.http.put<Audience>(`${this.url}/audiences/${id}`, payload);
  }

  getAudiencesByAffaire(affaireId: number): Observable<Audience[]> {
    return this.http.get<Audience[]>(`${this.url}/audiences/affaire/${affaireId}`);
  }

  getAudiencier(start: string, end: string): Observable<Audience[]> {
    return this.http.get<Audience[]>(`${this.url}/audiencier`, { params: { start, end } });
  }

  recordJugement(payload: Jugement): Observable<Jugement> {
    return this.http.post<Jugement>(`${this.url}/jugements`, payload);
  }
}
