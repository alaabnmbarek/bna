import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Facture, FactureImportResponse, FacturesService } from './factures.service';
import { CardComponent } from '../../theme/shared/components/card/card.component';
import { AuthService } from '../../auth/auth.service';
import { NotesHonorairesComponent } from '../notes-honoraires/notes-honoraires.component';
import { NoteHonoraire, NoteHonoraireService } from '../notes-honoraires/note-honoraire.service';
import { ProfileService, UserProfile } from '../../auth/profile.service';

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, NotesHonorairesComponent],
  templateUrl: './factures.component.html',
  styleUrls: ['./factures.component.scss']
})
export class FacturesComponent implements OnInit {
  activeTab: 'FACTURES' | 'NOTES_HONORAIRES' = 'FACTURES';
  factures: Facture[] = [];
  filteredFactures: Facture[] = [];
  loading = false;
  search = '';
  
  filterStatus = 'ALL';
  filterType = 'ALL';

  showModal = false;
  editMode = false;
  currentFacture: Facture = this.getEmptyFacture();
  selectedFile: File | null = null;
  notesOptions: NoteHonoraire[] = [];
  notesLoading = false;
  selectedNoteId: number | null = null;

  showImportModal = false;
  importLoading = false;
  importFile: File | null = null;
  importPreviewUrl: string | null = null;
  importResult: FactureImportResponse | null = null;
  profile: UserProfile | null = null;

  banner: { kind: 'success' | 'danger'; message: string } | null = null;
  private bannerTimer: any;

  constructor(
    private facturesService: FacturesService,
    private noteService: NoteHonoraireService,
    private profileService: ProfileService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.loadFactures();
    this.loadNotesOptions();
    this.profileService.profile$.subscribe(p => this.profile = p);
    if (this.auth.token()) this.profileService.getProfile().subscribe();
  }

  setTab(tab: 'FACTURES' | 'NOTES_HONORAIRES') {
    this.activeTab = tab;
  }

  getEmptyFacture(): Facture {
    return {
      numero: this.generateFactureNumero(),
      montantHt: 0,
      tva: 19.0,
      montantTtc: 0,
      montantPaye: 0,
      resteAPayer: 0,
      statut: 'EN_COURS',
      dateFacture: new Date().toISOString().split('T')[0],
      typeLien: 'DOSSIER',
      referenceLien: ''
    };
  }

  private generateFactureNumero(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `FAC-${y}${m}${day}-${rand}`;
  }

  loadFactures() {
    this.loading = true;
    this.facturesService.getAll().subscribe({
      next: (data) => {
        this.factures = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.showBanner('danger', 'Erreur lors du chargement des factures');
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.filteredFactures = this.factures.filter(f => {
      const matchSearch = this.search === '' || 
        f.numero.toLowerCase().includes(this.search.toLowerCase()) || 
        f.referenceLien.toLowerCase().includes(this.search.toLowerCase());
      
      const matchStatus = this.filterStatus === 'ALL' || f.statut === this.filterStatus;
      const matchType = this.filterType === 'ALL' || f.typeLien === this.filterType;

      return matchSearch && matchStatus && matchType;
    });
  }

  openModal(facture?: Facture) {
    if (facture) {
      this.editMode = true;
      this.currentFacture = { ...facture };
    } else {
      this.editMode = false;
      this.currentFacture = this.getEmptyFacture();
    }
    this.selectedFile = null;
    this.selectedNoteId = null;
    this.loadNotesOptions();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.currentFacture = this.getEmptyFacture();
    this.selectedNoteId = null;
  }

  openImportModal() {
    this.showImportModal = true;
    this.importLoading = false;
    this.importFile = null;
    this.importResult = null;
    if (this.importPreviewUrl) URL.revokeObjectURL(this.importPreviewUrl);
    this.importPreviewUrl = null;
  }

  closeImportModal() {
    this.showImportModal = false;
    this.importLoading = false;
    this.importFile = null;
    this.importResult = null;
    if (this.importPreviewUrl) URL.revokeObjectURL(this.importPreviewUrl);
    this.importPreviewUrl = null;
  }

  onImportFileSelected(event: any) {
    if (!event?.target?.files || event.target.files.length === 0) return;
    const file: File = event.target.files[0];
    this.importFile = file;
    if (this.importPreviewUrl) URL.revokeObjectURL(this.importPreviewUrl);
    this.importPreviewUrl = URL.createObjectURL(file);
    this.importResult = null;
    this.importLoading = true;

    this.facturesService.importFacture(file).subscribe({
      next: (res) => {
        this.importResult = res;
        this.importLoading = false;
        this.showBanner('success', 'Facture importée avec succès');
        this.loadFactures();
      },
      error: () => {
        this.importLoading = false;
        this.showBanner('danger', 'Erreur lors de l’importation');
      }
    });
  }

  loadNotesOptions() {
    this.notesLoading = true;
    this.noteService.getAll().subscribe({
      next: (notes) => {
        this.notesOptions = (notes || []).slice().sort((a, b) => {
          const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
          const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
          return bTime - aTime;
        });
        this.notesLoading = false;
      },
      error: () => {
        this.notesOptions = [];
        this.notesLoading = false;
        this.showBanner('danger', 'Impossible de charger les notes d\'honoraires');
      }
    });
  }

  onNoteSelected() {
    if (!this.selectedNoteId) return;
    const note = this.notesOptions.find(n => n.id === this.selectedNoteId);
    if (!note) return;

    this.currentFacture.numero = `FAC-${note.numero}`;
    this.currentFacture.montantHt = Number(note.montantHonoraires || 0);
    this.currentFacture.tva = 19.0;
    this.currentFacture.montantTtc = Number(note.total || 0);
    this.currentFacture.montantPaye = 0;
    this.currentFacture.resteAPayer = Number(note.total || 0);
    this.currentFacture.statut = 'VALIDEE';
    this.currentFacture.dateFacture = new Date().toISOString().split('T')[0];
    this.currentFacture.typeLien = note.typeLien;
    this.currentFacture.referenceLien = note.referenceLien;
    this.currentFacture.fichierJustificatif = note.fichierJustificatif;
  }

  calculateTtc() {
    if (this.currentFacture.montantHt && this.currentFacture.tva != null) {
      this.currentFacture.montantTtc = this.currentFacture.montantHt * (1 + this.currentFacture.tva / 100);
      this.calculateReste();
    }
  }

  calculateReste() {
    if (this.currentFacture.montantTtc != null) {
      const paye = this.currentFacture.montantPaye || 0;
      this.currentFacture.resteAPayer = this.currentFacture.montantTtc - paye;
      if (this.currentFacture.resteAPayer <= 0 && this.currentFacture.statut !== 'VALIDEE') {
        this.currentFacture.statut = 'PAYEE';
      }
    }
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      // Simulate file upload by setting a fake name
      this.currentFacture.fichierJustificatif = this.selectedFile?.name;
    }
  }

  saveFacture() {
    if (this.selectedNoteId) {
      const note = this.notesOptions.find(n => n.id === this.selectedNoteId);
      if (!note) {
        this.showBanner('danger', 'Note introuvable');
        return;
      }

      const afterSuccess = (msg: string) => {
        this.showBanner('success', msg);
        this.loadFactures();
        this.closeModal();
      };

      if (note.statut === 'SOUMISE') {
        this.noteService.validate(note.id!).subscribe({
          next: () => afterSuccess('Facture générée depuis la note d\'honoraire'),
          error: () => this.showBanner('danger', 'Erreur lors de la validation de la note')
        });
        return;
      }

      if (note.statut === 'VALIDEE') {
        this.showBanner('success', 'Cette note est déjà validée');
        return;
      }

      if (this.auth.role() === 'ROLE_ADMIN' || this.auth.role() === 'ROLE_CHARGE_DOSSIER') {
        this.noteService.submit(note.id!).subscribe({
          next: () => {
            this.noteService.validate(note.id!).subscribe({
              next: () => afterSuccess('Facture générée depuis la note d\'honoraire'),
              error: () => this.showBanner('danger', 'Erreur lors de la validation de la note')
            });
          },
          error: () => this.showBanner('danger', 'Impossible de soumettre la note')
        });
        return;
      }

      this.showBanner('danger', 'La note doit être soumise avant de générer une facture');
      return;
    }

    if (this.editMode && this.currentFacture.id) {
      this.facturesService.update(this.currentFacture.id, this.currentFacture).subscribe({
        next: () => {
          this.showBanner('success', 'Facture modifiée avec succès');
          this.loadFactures();
          this.closeModal();
        },
        error: () => this.showBanner('danger', 'Erreur lors de la modification')
      });
    } else {
      this.facturesService.create(this.currentFacture).subscribe({
        next: () => {
          this.showBanner('success', 'Facture créée avec succès');
          this.loadFactures();
          this.closeModal();
        },
        error: () => this.showBanner('danger', 'Erreur lors de la création')
      });
    }
  }

  deleteFacture(id: number) {
    if (confirm('Voulez-vous vraiment supprimer cette facture ?')) {
      this.facturesService.delete(id).subscribe({
        next: () => {
          this.showBanner('success', 'Facture supprimée');
          this.loadFactures();
        },
        error: () => this.showBanner('danger', 'Erreur lors de la suppression')
      });
    }
  }

  exportData(format: 'pdf' | 'excel') {
    this.showBanner('success', `Génération du rapport ${format.toUpperCase()} en cours...`);
    // Simulated export
    setTimeout(() => {
      this.showBanner('success', `Export ${format.toUpperCase()} terminé.`);
    }, 1500);
  }

  showBanner(kind: 'success' | 'danger', message: string) {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner = null, 4000);
  }
}
