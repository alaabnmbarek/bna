import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { SuiviJudiciaireService, AffaireJudiciaire, Audience, Jugement, ProcedureType, AffaireStatus, AudienceStatus, DecisionType } from '../suivi-judiciaire/suivi-judiciaire.service';
import { ContentieuxService, DossierContentieux } from '../contentieux/contentieux.service';
import { PrestatairesService, Prestataire } from '../prestataires/prestataires.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-suivi-judiciaire',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './suivi-judiciaire.component.html',
  styleUrl: './suivi-judiciaire.component.scss'
})
export class SuiviJudiciaireComponent implements OnInit {
  affaires: AffaireJudiciaire[] = [];
  audiences: Audience[] = [];
  dossiers: DossierContentieux[] = [];
  avocats: Prestataire[] = [];
  huissiers: Prestataire[] = [];
  
  loading = false;
  showAffaireForm = false;
  showAudienceForm = false;
  showJugementForm = false;
  selectedAffaire: AffaireJudiciaire | null = null;

  procedureTypes: ProcedureType[] = ['ASSIGNATION', 'INJONCTION_DE_PAYER', 'SAISIE_ARRET', 'SAISIE_IMMOBILIERE', 'SAISIE_MOBILIERE', 'APPEL', 'CASSATION'];
  audienceStatuses: AudienceStatus[] = ['PROGRAMMEE', 'REALISEE', 'REPORTEE', 'ANNULEE'];
  decisionTypes: DecisionType[] = ['GAIN', 'PERTE', 'REPORT', 'EXECUTION', 'RADIATION', 'NON_LIEU'];

  newAffaire: AffaireJudiciaire = this.blankAffaire();
  newAudience: Audience = this.blankAudience();
  newJugement: Jugement = this.blankJugement();

  constructor(
    public suiviService: SuiviJudiciaireService,
    public contentieuxService: ContentieuxService,
    public prestataireService: PrestatairesService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAffaires();
    this.loadDossiers();
    this.loadPrestataires();
  }

  loadAffaires(): void {
    this.loading = true;
    this.suiviService.getAllAffaires().subscribe({
      next: (data) => {
        this.affaires = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadDossiers(): void {
    this.contentieuxService.list().subscribe(data => this.dossiers = data);
  }

  loadPrestataires(): void {
    this.prestataireService.listPrestataires().subscribe(data => {
      this.avocats = data.filter(p => p.type === 'AVOCAT');
      this.huissiers = data.filter(p => p.type === 'HUISSIER');
    });
  }

  blankAffaire(): AffaireJudiciaire {
    return {
      dossierId: 0,
      referenceTribunal: '',
      typeProcedure: 'ASSIGNATION',
      tribunal: '',
      dateOuverture: new Date().toISOString().split('T')[0],
      observations: ''
    };
  }

  blankAudience(): Audience {
    return {
      affaireId: 0,
      dateAudience: '',
      objet: '',
      statut: 'PROGRAMMEE'
    };
  }

  blankJugement(): Jugement {
    return {
      affaireId: 0,
      dateJugement: new Date().toISOString().split('T')[0],
      typeDecision: 'GAIN',
      montantRecupere: 0,
      observations: ''
    };
  }

  openAffaireForm(): void {
    this.newAffaire = this.blankAffaire();
    this.showAffaireForm = true;
  }

  saveAffaire(): void {
    this.suiviService.createAffaire(this.newAffaire).subscribe(() => {
      this.showAffaireForm = false;
      this.loadAffaires();
    });
  }

  viewAudiences(affaire: AffaireJudiciaire): void {
    if (!affaire || !affaire.id) {
      console.error('Affaire ou ID manquant pour charger les audiences');
      return;
    }
    
    this.selectedAffaire = affaire;
    this.showAudienceForm = true; // Ouvrir le modal immédiatement
    this.audiences = []; // Vider la liste actuelle
    this.loading = true; // On peut réutiliser la variable loading ou en créer une spécifique

    this.addAudience(); // Préparer le formulaire d'ajout
    
    this.suiviService.getAudiencesByAffaire(affaire.id).subscribe({
      next: (data) => {
        this.audiences = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des audiences', err);
        this.loading = false;
        alert('Impossible de charger les audiences.');
      }
    });
  }

  addAudience(): void {
    this.newAudience = this.blankAudience();
    this.newAudience.affaireId = this.selectedAffaire!.id!;
    // Use the current date and time as a default for the datetime-local input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.newAudience.dateAudience = now.toISOString().slice(0, 16);
  }

  saveAudience(): void {
    if (!this.newAudience.dateAudience || !this.newAudience.objet) {
      alert('Veuillez saisir la date et l\'objet de l\'audience.');
      return;
    }
    this.suiviService.scheduleAudience(this.newAudience).subscribe({
      next: () => {
        this.viewAudiences(this.selectedAffaire!);
        this.newAudience = this.blankAudience();
        this.addAudience(); // Reset with new default date
      },
      error: (err) => {
        console.error('Erreur lors de la programmation de l\'audience', err);
        alert('Erreur lors de la programmation de l\'audience.');
      }
    });
  }

  openJugementForm(affaire: AffaireJudiciaire): void {
    this.selectedAffaire = affaire;
    this.newJugement = this.blankJugement();
    this.newJugement.affaireId = affaire.id!;
    this.showJugementForm = true;
  }

  saveJugement(): void {
    this.suiviService.recordJugement(this.newJugement).subscribe(() => {
      this.showJugementForm = false;
      this.loadAffaires();
    });
  }
}
