import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatbotAction, ChatbotItem, ChatbotResponse } from './chatbot.model';
import { ChatbotService } from './chatbot.service';

type UiMessage =
  | { role: 'user'; text: string }
  | { role: 'bot'; text: string; intent?: string | null; items?: ChatbotItem[]; actions?: ChatbotAction[] };

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent {
  open = false;
  input = '';
  loading = false;
  messages: UiMessage[] = [
    {
      role: 'bot',
      text: 'Bonjour. Dites par exemple : "dossiers ouverts", "mes missions en retard", "factures payées", "audiences cette semaine", "mes alertes".'
    }
  ];

  constructor(private api: ChatbotService, private router: Router) {}

  toggle(): void {
    this.open = !this.open;
  }

  close(): void {
    this.open = false;
  }

  send(): void {
    const text = (this.input || '').trim();
    if (!text || this.loading) return;

    this.messages = [...this.messages, { role: 'user', text }];
    this.input = '';
    this.loading = true;

    this.api.message({ message: text, maxResults: 8 }).subscribe({
      next: (res: ChatbotResponse) => {
        this.loading = false;
        this.messages = [
          ...this.messages,
          {
            role: 'bot',
            text: res.answer || 'OK',
            intent: res.intent,
            items: res.items || [],
            actions: res.actions || []
          }
        ];
      },
      error: (err) => {
        this.loading = false;
        const msg =
          err?.status === 401
            ? 'Session expirée. Reconnectez-vous.'
            : err?.status === 403
              ? 'Accès refusé.'
              : 'Erreur lors du traitement de la demande.';
        this.messages = [...this.messages, { role: 'bot', text: msg }];
      }
    });
  }

  handleAction(a: ChatbotAction): void {
    const route = (a?.route || '').trim();
    if (!route) return;
    this.router.navigateByUrl(route).then(() => this.close());
  }

  trackByIndex(i: number): number {
    return i;
  }
}
