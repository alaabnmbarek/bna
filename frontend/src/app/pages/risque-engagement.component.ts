import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';

@Component({
  selector: 'app-risque-engagement',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './risque-engagement.component.html',
  styleUrl: './risque-engagement.component.scss'
})
export class RisqueEngagementPageComponent implements OnInit {
  private readonly storageKey = 'pfe.risque.engagements.v1';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  search = '';
  loading = false;
  editingId: string | null = null;

  form = {
    numeroCompte: '',
    titreCreance: '',
    dateContrat: '',
    interetType: '' as '' | 'IC' | 'IR',
    taux: '' as string,
    echeance: '',
    montantRestant: '' as string,
    numRisque: ''
  };

  engagements: Array<{
    id: string;
    numeroCompte: string;
    titreCreance: string;
    dateContrat: string;
    interetType: '' | 'IC' | 'IR';
    taux: string;
    echeance: string;
    montantRestant: string;
    numRisque: string;
    createdAt: string;
  }> = [];

  ngOnInit(): void {
    this.engagements = this.storageRead(this.storageKey, []);
  }

  save(): void {
    const requiredOk = this.form.numeroCompte.trim() && this.form.titreCreance.trim() && this.form.numRisque.trim();
    if (!requiredOk) {
      this.showBanner('Veuillez renseigner : N° compte, Titre créance et Num risque.', 'danger');
      return;
    }
    const payload = {
      numeroCompte: this.form.numeroCompte.trim(),
      titreCreance: this.form.titreCreance.trim(),
      dateContrat: this.form.dateContrat || '',
      interetType: this.form.interetType,
      taux: this.form.taux || '',
      echeance: this.form.echeance || '',
      montantRestant: this.form.montantRestant || '',
      numRisque: this.form.numRisque.trim()
    };

    if (this.editingId) {
      this.engagements = this.engagements.map((e) => (e.id === this.editingId ? { ...e, ...payload } : e));
      this.persist();
      this.showBanner('Engagement mis à jour.', 'success');
      this.editingId = null;
      return;
    }

    const row = {
      id: this.newId(),
      ...payload,
      createdAt: this.now()
    };
    this.engagements = [row, ...this.engagements];
    this.persist();
    this.showBanner('Engagement enregistré.', 'success');
  }

  openEdit(row: { id: string } & typeof this.form): void {
    this.editingId = row.id;
    this.form = {
      numeroCompte: row.numeroCompte,
      titreCreance: row.titreCreance,
      dateContrat: row.dateContrat,
      interetType: row.interetType,
      taux: row.taux,
      echeance: row.echeance,
      montantRestant: row.montantRestant,
      numRisque: row.numRisque
    };
  }

  remove(row: { id: string; numeroCompte: string }): void {
    const ok = confirm(`Supprimer l’engagement du compte ${row.numeroCompte} ?`);
    if (!ok) return;
    this.engagements = this.engagements.filter((e) => e.id !== row.id);
    this.persist();
    if (this.editingId === row.id) {
      this.editingId = null;
      this.reset();
    }
    this.showBanner('Engagement supprimé.', 'info');
  }

  reset(): void {
    this.form = {
      numeroCompte: '',
      titreCreance: '',
      dateContrat: '',
      interetType: '',
      taux: '',
      echeance: '',
      montantRestant: '',
      numRisque: ''
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.reset();
  }

  filteredEngagements(): typeof this.engagements {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.engagements;
    return this.engagements.filter((e) => {
      return (
        e.numeroCompte.toLowerCase().includes(q) ||
        e.titreCreance.toLowerCase().includes(q) ||
        e.numRisque.toLowerCase().includes(q)
      );
    });
  }

  filteredCount(): number {
    return this.filteredEngagements().length;
  }

  private newId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return String(Date.now()) + '-' + Math.random().toString(16).slice(2);
  }

  private now(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.engagements));
    } catch {
      return;
    }
  }

  private storageRead<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private showBanner(message: string, kind: 'success' | 'info' | 'danger'): void {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner = null;
      this.bannerTimer = null;
    }, 2500);
  }
}
