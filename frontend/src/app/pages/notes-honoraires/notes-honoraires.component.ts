import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoteHonoraire, CreateNoteRequest, NoteHonoraireService } from './note-honoraire.service';
import { CardComponent } from '../../theme/shared/components/card/card.component';
import { AuthService } from '../../auth/auth.service';
import { ContentieuxService, DossierContentieux, DossierDetailsResponse } from '../../contentieux/contentieux.service';
import { AffaireJudiciaire, SuiviJudiciaireService } from '../../suivi-judiciaire/suivi-judiciaire.service';
import { ProfileService, UserProfile } from '../../auth/profile.service';
import { PrestatairesService, Prestataire } from '../../prestataires/prestataires.service';
import { Facture, FacturesService } from '../factures/factures.service';

@Component({
  selector: 'app-notes-honoraires',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './notes-honoraires.component.html',
  styleUrls: ['./notes-honoraires.component.scss']
})
export class NotesHonorairesComponent implements OnInit {
  @Output() factureGenerated = new EventEmitter<void>();

  notes: NoteHonoraire[] = [];
  filteredNotes: NoteHonoraire[] = [];
  loading = false;
  search = '';
  
  filterStatus = 'ALL';
  filterType = 'ALL';

  showModal = false;
  editMode = false;
  currentNoteId?: number;
  currentRequest: CreateNoteRequest = this.getEmptyRequest();
  selectedFile: File | null = null;
  currentFileName: string | undefined;

  dossiers: DossierContentieux[] = [];
  dossierDetails: DossierDetailsResponse | null = null;
  dossierDetailsLoading = false;
  affairesJudiciaires: AffaireJudiciaire[] = [];
  affairesLoading = false;

  prestataires: Prestataire[] = [];
  prestataireNomToShow: string = '';

  selectedAffaireId: number | null = null;
  selectedMissionId: number | null = null;

  previewTva = 0;
  previewTtc = 0;

  profile: UserProfile | null = null;

  banner: { kind: 'success' | 'danger'; message: string } | null = null;
  private bannerTimer: any;

  constructor(
    private noteService: NoteHonoraireService,
    private contentieuxService: ContentieuxService,
    private suiviJudiciaireService: SuiviJudiciaireService,
    private profileService: ProfileService,
    private prestatairesService: PrestatairesService,
    private facturesService: FacturesService,
    public auth: AuthService
  ) {}

  ngOnInit() {
    this.loadNotes();
    this.loadDossiers();
    if (this.isResponsable) {
      this.loadPrestataires();
    }
    this.profileService.profile$.subscribe(p => this.profile = p);
    if (this.auth.token()) {
      this.profileService.getProfile().subscribe();
    }
  }

  loadPrestataires() {
    this.prestatairesService.listPrestataires({ actif: true }).subscribe({
      next: (data) => this.prestataires = data,
      error: () => console.error('Erreur chargement prestataires')
    });
  }

  getEmptyRequest(): CreateNoteRequest {
    return {
      prestataireId: undefined,
      dossierId: 0,
      typeLien: 'DOSSIER',
      referenceLien: '',
      montantHonoraires: 0,
      fraisAdministratifs: 0,
      fichierJustificatif: ''
    };
  }

  get isPrestataire(): boolean {
    const r = this.auth.role();
    return [
      'ROLE_PRESTATAIRE',
      'ROLE_AVOCAT',
      'ROLE_HUISSIER',
      'ROLE_EXPERT',
      'PRESTATAIRE',
      'AVOCAT',
      'HUISSIER',
      'EXPERT',
      'ROLE_ADMIN',
      'ROLE_CHARGE_DOSSIER'
    ].includes(r || '');
  }

  get isResponsable(): boolean {
    return this.auth.role() === 'ROLE_ADMIN' || this.auth.role() === 'ROLE_RESPONSABLE_CONTENTIEUX';
  }

  loadDossiers() {
    this.contentieuxService.list().subscribe({
      next: (data) => {
        this.dossiers = data;
      },
      error: () => {
        this.showBanner('danger', 'Erreur lors du chargement des dossiers');
      }
    });
  }

  onDossierChange() {
    this.selectedAffaireId = null;
    this.selectedMissionId = null;
    this.affairesJudiciaires = [];
    this.dossierDetails = null;

    if (!this.currentRequest.dossierId) {
      this.currentRequest.referenceLien = '';
      return;
    }

    this.dossierDetailsLoading = true;
    this.contentieuxService.getDossierDetails(this.currentRequest.dossierId).subscribe({
      next: (details) => {
        this.dossierDetails = details;
        this.dossierDetailsLoading = false;
      },
      error: () => {
        this.dossierDetails = null;
        this.dossierDetailsLoading = false;
      }
    });

    this.affairesLoading = true;
    this.suiviJudiciaireService.getAffairesByDossier(this.currentRequest.dossierId).subscribe({
      next: (data) => {
        this.affairesJudiciaires = data;
        this.affairesLoading = false;
      },
      error: () => {
        this.affairesJudiciaires = [];
        this.affairesLoading = false;
      }
    });

    this.onTypeLienChange();
    this.updatePreview();
  }

  onTypeLienChange() {
    this.selectedAffaireId = null;
    this.selectedMissionId = null;
    if (!this.currentRequest.dossierId) {
      this.currentRequest.referenceLien = '';
      return;
    }

    if (this.currentRequest.typeLien === 'DOSSIER') {
      const d = this.dossiers.find(x => x.id === this.currentRequest.dossierId);
      this.currentRequest.referenceLien = d?.reference || String(this.currentRequest.dossierId);
      return;
    }

    this.currentRequest.referenceLien = '';
  }

  onAffaireChange() {
    if (this.selectedAffaireId != null) {
      this.currentRequest.referenceLien = String(this.selectedAffaireId);
    }
  }

  onMissionChange() {
    if (this.selectedMissionId != null) {
      this.currentRequest.referenceLien = String(this.selectedMissionId);
    }
  }

  updatePreview() {
    const toNumber = (v: unknown): number => {
      if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
      if (typeof v === 'string') {
        const parsed = Number.parseFloat(v.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : 0;
      }
      return 0;
    };

    const round3 = (v: number): number => {
      if (!Number.isFinite(v)) return 0;
      return Math.round(v * 1000) / 1000;
    };

    const ht = round3(toNumber(this.currentRequest.montantHonoraires));
    this.currentRequest.fraisAdministratifs = 0;

    const base = ht;
    const tva = round3(base * 0.19);
    const ttc = round3(base + tva);
    this.previewTva = tva;
    this.previewTtc = ttc;
  }

  loadNotes() {
    this.loading = true;
    this.noteService.getAll().subscribe({
      next: (data) => {
        this.notes = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.showBanner('danger', 'Erreur lors du chargement des notes d\'honoraires');
        this.loading = false;
      }
    });
  }

  applyFilters() {
    if (!this.notes) {
      this.filteredNotes = [];
      return;
    }
    this.filteredNotes = this.notes.filter(n => {
      const s = this.search.toLowerCase();
      const matchSearch = this.search === '' || 
        (n.numero && n.numero.toLowerCase().includes(s)) || 
        (n.referenceLien && n.referenceLien.toLowerCase().includes(s)) ||
        (n.prestataireNom && n.prestataireNom.toLowerCase().includes(s));
      
      const matchStatus = this.filterStatus === 'ALL' || n.statut === this.filterStatus;
      const matchType = this.filterType === 'ALL' || n.typeLien === this.filterType;

      return matchSearch && matchStatus && matchType;
    });
  }

  openModal(note?: NoteHonoraire) {
    if (note) {
      this.editMode = true;
      this.currentNoteId = note.id;
      this.prestataireNomToShow = note.prestataireNom;
      this.currentRequest = {
        prestataireId: note.prestataireId,
        dossierId: note.dossierId,
        typeLien: note.typeLien,
        referenceLien: note.referenceLien,
        montantHonoraires: note.montantHonoraires,
        fraisAdministratifs: note.fraisAdministratifs,
        fichierJustificatif: note.fichierJustificatif
      };
      this.currentFileName = note.fichierJustificatif;
      this.onDossierChange();
      if (note.typeLien === 'AFFAIRE') {
        const id = Number(note.referenceLien);
        this.selectedAffaireId = Number.isFinite(id) ? id : null;
        this.onAffaireChange();
      }
      if (note.typeLien === 'MISSION') {
        const id = Number(note.referenceLien);
        this.selectedMissionId = Number.isFinite(id) ? id : null;
        this.onMissionChange();
      }
    } else {
      this.editMode = false;
      this.currentNoteId = undefined;
      this.prestataireNomToShow = this.profile?.fullName || this.profile?.username || '';
      this.currentRequest = this.getEmptyRequest();
      this.currentFileName = undefined;
    }
    this.selectedFile = null;
    this.updatePreview();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  onFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
      this.currentRequest.fichierJustificatif = this.selectedFile?.name;
      this.currentFileName = this.selectedFile?.name;
    }
  }

  saveNote() {
    this.currentRequest.fraisAdministratifs = 0;
    console.log('Tentative d\'enregistrement de la note:', this.currentRequest);
    
    if (this.editMode && this.currentNoteId) {
      this.noteService.update(this.currentNoteId, this.currentRequest).subscribe({
        next: () => {
          this.showBanner('success', 'Note modifiée avec succès');
          this.loadNotes();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur modification note:', err);
          this.showBanner('danger', 'Erreur lors de la modification');
        }
      });
    } else {
      this.noteService.create(this.currentRequest).subscribe({
        next: (res) => {
          console.log('Note créée avec succès:', res);
          this.showBanner('success', 'Note créée avec succès');
          this.loadNotes();
          this.closeModal();
        },
        error: (err) => {
          console.error('Erreur création note:', err);
          this.showBanner('danger', 'Erreur lors de la création');
        }
      });
    }
  }

  submitNote(id: number) {
    if (confirm('Voulez-vous vraiment soumettre cette note ? Elle ne sera plus modifiable.')) {
      this.noteService.submit(id).subscribe({
        next: () => {
          this.showBanner('success', 'Note soumise avec succès');
          this.loadNotes();
        },
        error: () => this.showBanner('danger', 'Erreur lors de la soumission')
      });
    }
  }

  validateNote(id: number) {
    if (!confirm('Voulez-vous vraiment valider cette note ? Une facture sera automatiquement générée.')) return;
    console.log('[DEBUG] Validation de la note ID:', id);
    const noteSnapshot = this.notes.find(n => n.id === id);
    this.noteService.validate(id).subscribe({
      next: () => {
        console.log('[DEBUG] Note validée avec succès, émission de factureGenerated');
        this.showBanner('success', 'Note validée et facture générée');
        this.loadNotes();
        if (noteSnapshot) {
          this.facturesService.getAll().subscribe({
            next: (factures) => {
              const alreadyExists = factures.some(f => f.noteHonoraireId === id || f.numero === `FAC-${noteSnapshot.numero}`);
              if (alreadyExists) {
                this.factureGenerated.emit();
                return;
              }

              const facture: Facture = {
                numero: `FAC-${noteSnapshot.numero}`,
                montantHt: Number((noteSnapshot.montantHonoraires || 0) + (noteSnapshot.fraisAdministratifs || 0)),
                tva: Number(noteSnapshot.tva ?? 19),
                montantTtc: Number(noteSnapshot.total || 0),
                montantPaye: 0,
                resteAPayer: Number(noteSnapshot.total || 0),
                statut: 'VALIDEE',
                dateFacture: new Date().toISOString().split('T')[0],
                typeLien: noteSnapshot.typeLien,
                referenceLien: noteSnapshot.referenceLien,
                prestataireId: noteSnapshot.prestataireId,
                fichierJustificatif: noteSnapshot.fichierJustificatif,
                remarques: noteSnapshot.remarques || '',
                noteHonoraireId: id,
                prestations: (noteSnapshot.prestations || []).map(p => ({
                  type: p.type,
                  description: p.description,
                  quantite: 1,
                  prixUnitaire: p.montant,
                  montant: p.montant
                }))
              };

              if (!facture.prestations || facture.prestations.length === 0) {
                facture.prestations = [{
                  type: 'HONORAIRES',
                  description: 'Honoraires forfaitaires',
                  quantite: 1,
                  prixUnitaire: facture.montantHt,
                  montant: facture.montantHt
                }];
              }

              this.facturesService.create(facture).subscribe({
                next: () => this.factureGenerated.emit(),
                error: (err) => {
                  console.error('[DEBUG] Erreur création facture fallback:', err);
                  this.factureGenerated.emit();
                }
              });
            },
            error: (err) => {
              console.error('[DEBUG] Erreur chargement factures fallback:', err);
              this.factureGenerated.emit();
            }
          });
        } else {
          this.factureGenerated.emit();
        }
      },
      error: (err) => {
        console.error('[DEBUG] Erreur validation note:', err);
        this.showBanner('danger', 'Erreur lors de la validation');
      }
    });
  }

  rejectNote(id: number) {
    if (confirm('Voulez-vous rejeter cette note ? Elle sera retournée au prestataire.')) {
      this.noteService.reject(id).subscribe({
        next: () => {
          this.showBanner('success', 'Note rejetée');
          this.loadNotes();
        },
        error: () => this.showBanner('danger', 'Erreur lors du rejet')
      });
    }
  }

  deleteNote(id: number) {
    if (confirm('Voulez-vous supprimer cette note ?')) {
      this.noteService.delete(id).subscribe({
        next: () => {
          this.showBanner('success', 'Note supprimée');
          this.loadNotes();
        },
        error: () => this.showBanner('danger', 'Erreur lors de la suppression')
      });
    }
  }

  showBanner(kind: 'success' | 'danger', message: string) {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.banner = null, 4000);
  }
}
