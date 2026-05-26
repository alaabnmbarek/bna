import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LegalPredictionRequest {
  specialite_avocat: string;
  experience_avocat: number;
  presence_huissier: number;
  presence_expert: number;
  nombre_audiences: number;
  type_affaire: string;
  type_procedure: string;
  nombre_reports: number;
}

export interface LegalPredictionResponse {
  prediction: string;
  probability: number;
}

@Injectable({ providedIn: 'root' })
export class LegalPredictionService {
  constructor(private http: HttpClient) {}

  predict(payload: LegalPredictionRequest): Observable<LegalPredictionResponse> {
    return this.http.post<LegalPredictionResponse>(`${environment.legalPredictionBaseUrl}/predict`, payload);
  }
}
