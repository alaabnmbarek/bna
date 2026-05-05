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
  messages: UiMessage[] = [];
  private greeted = false;

  constructor(private api: ChatbotService, private router: Router) {}

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.ensureGreeting();
    }
  }

  close(): void {
    this.open = false;
  }

  private ensureGreeting(): void {
    if (this.greeted) return;
    this.greeted = true;
    this.messages = [
      ...this.messages,
      {
        role: 'bot',
        text: "Bonjour 👋 Que souhaitez-vous consulter ?\nCliquez une suggestion ou écrivez une demande similaire.",
        actions: [
          { type: 'PROMPT', label: '📂 Dossiers ouverts', route: 'dossiers ouverts' },
          { type: 'PROMPT', label: '📋 Missions en retard', route: 'missions en retard' },
          { type: 'PROMPT', label: '💰 Factures payées', route: 'factures payées' },
          { type: 'PROMPT', label: '⚖️ Audiences cette semaine', route: 'audiences cette semaine' },
          { type: 'PROMPT', label: '🔔 Mes alertes', route: 'mes alertes' }
        ]
      }
    ];
  }

  send(): void {
    const text = (this.input || '').trim();
    if (!text || this.loading) return;
    this.submit(text);
  }

  private submit(text: string): void {
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
    const type = (a?.type || '').trim().toUpperCase();
    const value = (a?.route || '').trim();
    if (!value) return;

    if (type === 'PROMPT') {
      if (this.loading) return;
      this.submit(value);
      return;
    }

    this.router.navigateByUrl(value).then(() => this.close());
  }

  trackByIndex(i: number): number {
    return i;
  }
}
