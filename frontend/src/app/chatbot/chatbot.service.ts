import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatbotRequest, ChatbotResponse } from './chatbot.model';

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  constructor(private http: HttpClient) {}

  message(req: ChatbotRequest): Observable<ChatbotResponse> {
    return this.http.post<ChatbotResponse>('/api/chatbot/message', req);
  }
}
