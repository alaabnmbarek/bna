import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';

@Component({
  selector: 'app-risque-garanties-cautions',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './risque-garanties-cautions.component.html',
  styleUrl: './risque-garanties-cautions.component.scss'
})
export class RisqueGarantiesCautionsPageComponent implements OnInit {
  private readonly keyCautions = 'pfe.risque.garanties.cautions.v1';

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;

  search = '';
  editingId: string | null = null;

  caution = {
    numeroDossier: '',
    description: '',
    numeroGarant: '',
    numeroCompte: '',
    natureCaution: '',
    dateContrat: '',
    montantLimite: '',
    typeDocumentCaution: '',
    numeroDocument: ''
  };

  cautions: Array<{
    id: string;
    createdAt: string;
    numeroDossier: string;
    description: string;
    numeroGarant: string;
    numeroCompte: string;
    natureCaution: string;
    dateContrat: string;
    montantLimite: string;
    typeDocumentCaution: string;
    numeroDocument: string;
  }> = [];

  ngOnInit(): void {
    this.cautions = this.storageRead(this.keyCautions, []);
  }

  save(): void {
    const ok = this.caution.numeroDossier.trim() && this.caution.numeroCompte.trim();
    if (!ok) {
      this.showBanner('Veuillez renseigner : N° Dossier et N° compte.', 'danger');
      return;
    }

    const payload = {
      numeroDossier: this.caution.numeroDossier.trim(),
      description: this.caution.description || '',
      numeroGarant: this.caution.numeroGarant || '',
      numeroCompte: this.caution.numeroCompte.trim(),
      natureCaution: this.caution.natureCaution || '',
      dateContrat: this.caution.dateContrat || '',
      montantLimite: this.caution.montantLimite || '',
      typeDocumentCaution: this.caution.typeDocumentCaution || '',
      numeroDocument: this.caution.numeroDocument || ''
    };

    if (this.editingId) {
      this.cautions = this.cautions.map((c) => (c.id === this.editingId ? { ...c, ...payload } : c));
      this.persist();
      this.editingId = null;
      this.showBanner('Caution mise à jour.', 'success');
      return;
    }

    this.cautions = [
      {
        id: this.newId(),
        createdAt: this.now(),
        ...payload
      },
      ...this.cautions
    ];
    this.persist();
    this.showBanner('Caution enregistrée.', 'success');
  }

  reset(): void {
    this.caution = {
      numeroDossier: '',
      description: '',
      numeroGarant: '',
      numeroCompte: '',
      natureCaution: '',
      dateContrat: '',
      montantLimite: '',
      typeDocumentCaution: '',
      numeroDocument: ''
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.reset();
  }

  openEdit(row: { id: string } & typeof this.caution): void {
    this.editingId = row.id;
    this.caution = {
      numeroDossier: row.numeroDossier,
      description: row.description,
      numeroGarant: row.numeroGarant,
      numeroCompte: row.numeroCompte,
      natureCaution: row.natureCaution,
      dateContrat: row.dateContrat,
      montantLimite: row.montantLimite,
      typeDocumentCaution: row.typeDocumentCaution,
      numeroDocument: row.numeroDocument
    };
  }

  remove(row: { id: string; numeroDossier: string; numeroCompte: string }): void {
    const ok = confirm(`Supprimer la caution (dossier ${row.numeroDossier}, compte ${row.numeroCompte}) ?`);
    if (!ok) return;
    this.cautions = this.cautions.filter((c) => c.id !== row.id);
    this.persist();
    if (this.editingId === row.id) {
      this.editingId = null;
      this.reset();
    }
    this.showBanner('Caution supprimée.', 'info');
  }

  filtered(): typeof this.cautions {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.cautions;
    return this.cautions.filter((c) => {
      return (
        (c.numeroDossier || '').toLowerCase().includes(q) ||
        (c.numeroCompte || '').toLowerCase().includes(q) ||
        (c.numeroGarant || '').toLowerCase().includes(q) ||
        (c.natureCaution || '').toLowerCase().includes(q)
      );
    });
  }

  private persist(): void {
    this.storageWrite(this.keyCautions, this.cautions);
  }

  private storageWrite(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
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

  private showBanner(message: string, kind: 'success' | 'info' | 'danger'): void {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner = null;
      this.bannerTimer = null;
    }, 2500);
  }
}

