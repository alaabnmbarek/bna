import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { ContentieuxService, DossierContentieux } from '../contentieux/contentieux.service';
import { SuiviJudiciaireService, AffaireJudiciaire } from '../suivi-judiciaire/suivi-judiciaire.service';
import { CardComponent } from '../theme/shared/components/card/card.component';
import { Mission, MissionResult, MissionResultStatus, MissionStatus, MissionType, Prestataire, PrestataireType, PrestatairesService } from '../prestataires/prestataires.service';

@Component({
  selector: 'app-missions-page',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent],
  templateUrl: './missions.component.html',
  styleUrl: './missions.component.scss'
})
export class MissionsPageComponent implements OnInit {
  loading = false;
  savingMission = false;
  savingResult = false;
  uploadingProof = false;
  showAssignForm = false;
  showResultModal = false;
  showMissionModal = false;
  missionModalLoading = false;
  selectedMission: Mission | null = null;
  selectedMissionResult: MissionResult | null = null;
  selectedProcedureFallback: AffaireJudiciaire | null = null;
  resultsByMissionId: Record<number, MissionResult | null> = {};

  dossiers: DossierContentieux[] = [];
  procedures: AffaireJudiciaire[] = [];
  prestataires: Prestataire[] = [];
  missions: Mission[] = [];

  missionSearch = '';
  missionSortKey: 'code' | 'type' | 'statut' | 'dateDebut' | 'dateFin' | 'prestataire' = 'dateDebut';
  missionSortDir: 'asc' | 'desc' = 'desc';

  selectedPrestataireType: PrestataireType | '' = '';
  selectedPrestataireId: number | null = null;

  missionTypes: Array<{ value: MissionType; label: string }> = [
    { value: 'MISSION_ASSIGNATION', label: "Mission d'assignation" },
    { value: 'MISSION_RECOUVREMENT_JUDICIAIRE', label: 'Mission de recouvrement judiciaire' },
    { value: 'MISSION_SIGNIFICATION', label: 'Mission de signification' },
    { value: 'MISSION_EXPERTISE', label: "Mission d'expertise" }
  ];

  missionStatuses: Array<{ value: MissionStatus; label: string }> = [
    { value: 'ASSIGNEE', label: 'assignée' },
    { value: 'EN_COURS', label: 'en cours' },
    { value: 'TERMINEE', label: 'terminée' },
    { value: 'ECHOUEE', label: 'échouée' },
    { value: 'ANNULEE', label: 'annulée' }
  ];

  resultStatuses: Array<{ value: MissionResultStatus; label: string }> = [
    { value: 'EN_COURS', label: 'en cours' },
    { value: 'TERMINEE', label: 'terminée' },
    { value: 'ECHOUEE', label: 'échouée' }
  ];

  formMission: {
    idAuto: string;
    typeMission: MissionType | '';
    codeMission: string;
    description: string;
    dureeEstimee: string;
    prestataireType: PrestataireType | '';
    prestataireId: number | null;
    dateCreation: string;
    procedureId: number | null;
    affaireNumero: string;
  } = this.blankMissionForm();

  formResult: {
    idAuto: string;
    missionId: number | null;
    statut: MissionResultStatus | '';
    dateDebut: string;
    dateFin: string;
    resultat: string;
    montantRecuperee: string;
    preuveFile: File | null;
  } = this.blankResultForm();

  banner: { kind: 'success' | 'info' | 'danger'; message: string } | null = null;
  private bannerTimer: ReturnType<typeof setTimeout> | null = null;
  missionCreateError: string | null = null;

  constructor(
    private prestatairesService: PrestatairesService,
    private suiviService: SuiviJudiciaireService,
    private contentieuxService: ContentieuxService,
    public auth: AuthService
  ) {}

  get canAssignMission(): boolean {
    const r = this.auth.role();
    return ['ROLE_ADMIN', 'ROLE_CHARGE_DOSSIER', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ADMIN', 'CHARGE_DOSSIER', 'RESPONSABLE_CONTENTIEUX'].includes(r || '');
  }

  get canSubmitMissionResult(): boolean {
    const r = this.auth.role();
    return [
      'ROLE_ADMIN',
      'ROLE_CHARGE_DOSSIER',
      'ROLE_RESPONSABLE_CONTENTIEUX',
      'ROLE_PRESTATAIRE',
      'ROLE_AVOCAT',
      'ROLE_HUISSIER',
      'ROLE_EXPERT',
      'ADMIN',
      'CHARGE_DOSSIER',
      'RESPONSABLE_CONTENTIEUX',
      'PRESTATAIRE',
      'AVOCAT',
      'HUISSIER',
      'EXPERT'
    ].includes(r || '');
  }

  ngOnInit(): void {
    this.loadAll();
  }

  toggleAssignForm(): void {
    this.showAssignForm = !this.showAssignForm;
    if (!this.showAssignForm) {
      this.formMission = this.blankMissionForm();
    }
  }

  openResultModal(): void {
    this.showResultModal = true;
    this.formResult = this.blankResultForm();
  }

  closeResultModal(): void {
    this.showResultModal = false;
    this.savingResult = false;
    this.uploadingProof = false;
    this.formResult = this.blankResultForm();
  }

  cancelAssignForm(): void {
    this.showAssignForm = false;
    this.savingMission = false;
    this.formMission = this.blankMissionForm();
  }

  cancelResultForm(): void {
    this.closeResultModal();
  }

  private blankMissionForm() {
    return {
      idAuto: 'Auto',
      typeMission: 'MISSION_ASSIGNATION' as MissionType,
      codeMission: '',
      description: '',
      dureeEstimee: '',
      prestataireType: '' as PrestataireType | '',
      prestataireId: null as number | null,
      dateCreation: this.today(),
      procedureId: null as number | null,
      affaireNumero: ''
    };
  }

  private blankResultForm() {
    return {
      idAuto: 'Auto',
      missionId: null as number | null,
      statut: '' as MissionResultStatus | '',
      dateDebut: '',
      dateFin: '',
      resultat: '',
      montantRecuperee: '',
      preuveFile: null as File | null
    };
  }

  today(): string {
    return new Date().toISOString().split('T')[0];
  }

  loadAll(): void {
    this.loading = true;
    this.banner = null;

    this.contentieuxService.list().subscribe({
      next: (rows) => (this.dossiers = rows || []),
      error: () => (this.dossiers = [])
    });

    this.suiviService.getAllAffaires().subscribe({
      next: (rows) => (this.procedures = rows || []),
      error: () => (this.procedures = [])
    });

    this.prestatairesService.listPrestataires({ actif: true }).subscribe({
      next: (rows) => (this.prestataires = rows || []),
      error: () => (this.prestataires = [])
    });

    const missions$ = this.canAssignMission ? this.prestatairesService.listAllMissions() : this.prestatairesService.listMyMissions();
    missions$.subscribe({
      next: (rows) => {
        this.missions = rows || [];
        this.prefetchResults(this.missions);
        this.loading = false;
      },
      error: () => {
        this.missions = [];
        this.loading = false;
        this.showBanner('Erreur lors du chargement des missions.', 'danger');
      }
    });
  }

  private prefetchResults(missions: Mission[]): void {
    this.resultsByMissionId = {};
    if (!this.canSubmitMissionResult) return;
    if (!missions || missions.length === 0) return;
    const requests = missions.map((m) =>
      this.prestatairesService.getMissionResult(m.id).pipe(
        catchError(() => of(null)),
        map((r) => ({ missionId: m.id, result: r }))
      )
    );
    forkJoin(requests).subscribe({
      next: (rows) => {
        for (const row of rows) {
          this.resultsByMissionId[row.missionId] = row.result;
        }
      },
      error: () => {}
    });
  }

  get missionResultsTable(): Array<{ mission: Mission; result: MissionResult }> {
    const out: Array<{ mission: Mission; result: MissionResult }> = [];
    for (const m of this.missions) {
      const r = this.resultsByMissionId[m.id];
      if (r) out.push({ mission: m, result: r });
    }
    out.sort((a, b) => (b.result.createdAt || '').localeCompare(a.result.createdAt || ''));
    return out;
  }

  get displayedMissions(): Mission[] {
    const q = (this.missionSearch || '').trim().toLowerCase();
    let rows = this.missions.slice();
    if (q) {
      rows = rows.filter((m) => {
        const code = this.missionCodeOrAuto(m).toLowerCase();
        const type = this.missionTypeLabelOrInfer(m).toLowerCase();
        const statut = (m.statut || '').toLowerCase();
        const dossier = (m.dossierReference || '').toLowerCase();
        const prest = this.prestataireNameById(m.prestataireId).toLowerCase();
        return code.includes(q) || type.includes(q) || statut.includes(q) || dossier.includes(q) || prest.includes(q);
      });
    }

    const dir = this.missionSortDir === 'asc' ? 1 : -1;
    const getDate = (v?: string | null) => {
      if (!v) return NaN;
      const t = new Date(v).getTime();
      return Number.isFinite(t) ? t : NaN;
    };
    const getKey = (m: Mission) => {
      switch (this.missionSortKey) {
        case 'code':
          return this.missionCodeOrAuto(m).toLowerCase();
        case 'type':
          return this.missionTypeLabelOrInfer(m).toLowerCase();
        case 'statut':
          return this.statusLabel(m).toLowerCase();
        case 'prestataire':
          return this.prestataireNameById(m.prestataireId).toLowerCase();
        case 'dateFin':
          return getDate(m.dateFin || m.dateEcheance || null);
        case 'dateDebut':
        default:
          return getDate(m.dateDebut || m.createdAt || null);
      }
    };

    rows.sort((a, b) => {
      const ka: any = getKey(a);
      const kb: any = getKey(b);
      if (typeof ka === 'number' || typeof kb === 'number') {
        const na = Number.isFinite(ka) ? ka : -Infinity;
        const nb = Number.isFinite(kb) ? kb : -Infinity;
        if (na < nb) return -1 * dir;
        if (na > nb) return 1 * dir;
        return 0;
      }
      if (ka < kb) return -1 * dir;
      if (ka > kb) return 1 * dir;
      return 0;
    });
    return rows;
  }

  toggleMissionSort(key: 'code' | 'type' | 'statut' | 'dateDebut' | 'dateFin' | 'prestataire'): void {
    if (this.missionSortKey === key) {
      this.missionSortDir = this.missionSortDir === 'asc' ? 'desc' : 'asc';
      return;
    }
    this.missionSortKey = key;
    this.missionSortDir = key === 'code' || key === 'type' || key === 'prestataire' ? 'asc' : 'desc';
  }

  sortIndicator(key: string): string {
    if (this.missionSortKey !== key) return '';
    return this.missionSortDir === 'asc' ? '▲' : '▼';
  }

  get filteredPrestataires(): Prestataire[] {
    if (!this.formMission.prestataireType) return [];
    return this.prestataires.filter((p) => p.type === this.formMission.prestataireType);
  }

  get selectedProcedure(): AffaireJudiciaire | undefined {
    if (!this.formMission.procedureId) return undefined;
    return this.procedures.find((p) => p.id === this.formMission.procedureId);
  }

  onPrestataireTypeChange(): void {
    this.formMission.prestataireId = null;
  }

  onProcedureChange(): void {
    const p = this.selectedProcedure;
    this.formMission.affaireNumero = p?.referenceTribunal || '';
  }

  submitMission(): void {
    this.missionCreateError = null;
    if (!this.formMission.typeMission) {
      this.showBanner('Type mission obligatoire.', 'danger');
      alert('Type mission obligatoire.');
      return;
    }
    if (!this.formMission.prestataireType) {
      this.showBanner('Prestataire assigné (type) obligatoire.', 'danger');
      alert('Prestataire assigné (type) obligatoire.');
      return;
    }
    if (!this.formMission.prestataireId) {
      this.showBanner('Nom prestataire obligatoire.', 'danger');
      alert('Nom prestataire obligatoire.');
      return;
    }
    const pid = Number(this.formMission.prestataireId);
    if (!Number.isFinite(pid) || pid <= 0) {
      const msg = `Prestataire invalide: ${String(this.formMission.prestataireId)}`;
      this.showBanner(msg, 'danger');
      this.missionCreateError = msg;
      return;
    }

    const proc = this.selectedProcedure;
    const titre = this.missionTypes.find((m) => m.value === this.formMission.typeMission)?.label || 'Mission';

    const payload: Partial<Mission> = {
      typeMission: this.formMission.typeMission,
      codeMission: this.formMission.codeMission || undefined,
      titre,
      description: this.formMission.description || undefined,
      dureeEstimee: this.toIntOrUndefined(this.formMission.dureeEstimee),
      procedureId: this.formMission.procedureId || undefined,
      dossierReference: proc?.dossierReference || undefined,
      statut: 'ASSIGNEE'
    };

    this.savingMission = true;
    this.prestatairesService.createMission(pid, payload).subscribe({
      next: (m) => {
        this.savingMission = false;
        this.missions = [m, ...this.missions];
        this.missionSearch = '';
        this.formMission = this.blankMissionForm();
        this.showAssignForm = false;
        this.showBanner('Mission affectée avec succès.', 'success');
        this.prestatairesService.listAllMissions().subscribe({
          next: (rows) => {
            this.missions = rows || [];
            this.prefetchResults(this.missions);
          },
          error: () => {}
        });
      },
      error: (err) => {
        this.savingMission = false;
        const msg = err?.error?.message || err?.error?.error || `Erreur lors de l'affectation de la mission. (${err?.status || ''})`;
        this.showBanner(msg, 'danger');
        alert(msg);
        this.missionCreateError = msg;
      }
    });
  }

  loadResultForMission(): void {
    if (!this.formResult.missionId) return;
    this.prestatairesService.getMissionResult(this.formResult.missionId).subscribe({
      next: (r) => {
        this.resultsByMissionId[this.formResult.missionId as number] = r;
        if (!r) return;
        this.formResult.statut = r.statut;
        this.formResult.dateDebut = r.dateDebut || '';
        this.formResult.dateFin = r.dateFin || '';
        this.formResult.resultat = r.resultat || '';
        this.formResult.montantRecuperee = r.montantRecuperee != null ? String(r.montantRecuperee) : '';
      }
    });
  }

  openMissionModal(m: Mission): void {
    this.selectedMission = m;
    this.selectedMissionResult = null;
    this.selectedProcedureFallback = null;
    if (!m.procedureId && m.dossierReference) {
      const dossier = this.dossiers.find(d =>
        d.reference === m.dossierReference ||
        d.compteActuel === m.dossierReference ||
        d.ancienCompte === m.dossierReference
      );
      const candidates = dossier
        ? this.procedures.filter(p => p.dossierId === dossier.id)
        : this.procedures.filter(p => p.dossierReference === m.dossierReference);
      let picked: AffaireJudiciaire | null = null;
      for (const c of candidates) {
        if (!picked) picked = c;
        else {
          const d1 = new Date(picked.dateOuverture).getTime();
          const d2 = new Date(c.dateOuverture).getTime();
          if (Number.isFinite(d2) && (!Number.isFinite(d1) || d2 > d1)) picked = c;
        }
      }
      this.selectedProcedureFallback = picked;
    }
    this.showMissionModal = true;
    this.missionModalLoading = true;
    this.prestatairesService.getMissionResult(m.id).subscribe({
      next: (r) => {
        this.selectedMissionResult = r;
        this.missionModalLoading = false;
      },
      error: () => {
        this.missionModalLoading = false;
      }
    });
  }

  closeMissionModal(): void {
    this.showMissionModal = false;
    this.missionModalLoading = false;
    this.selectedMission = null;
    this.selectedMissionResult = null;
    this.selectedProcedureFallback = null;
  }

  prestataireNameById(id?: number | null): string {
    if (!id) return '—';
    const p = this.prestataires.find(x => x.id === id);
    if (!p) return `#${id}`;
    return `${p.nom} ${p.prenom || ''}`.trim();
  }

  downloadSelectedProof(): void {
    if (!this.selectedMission) return;
    this.prestatairesService.downloadMissionProof(this.selectedMission.id).subscribe({
      next: (blob) => {
        const fileName = this.selectedMissionResult?.preuveFileName || `preuve-mission-${this.selectedMission?.id}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.showBanner("Impossible de télécharger la preuve.", 'danger');
      }
    });
  }

  submitResult(): void {
    if (!this.formResult.missionId) {
      this.showBanner('Mission obligatoire.', 'danger');
      return;
    }
    if (!this.formResult.statut) {
      this.showBanner('Statut mission obligatoire.', 'danger');
      return;
    }

    const payload: Partial<MissionResult> = {
      statut: this.formResult.statut,
      dateDebut: this.formResult.dateDebut || undefined,
      dateFin: this.formResult.dateFin || undefined,
      resultat: this.formResult.resultat || undefined,
      montantRecuperee: this.toDecimalOrUndefined(this.formResult.montantRecuperee)
    };

    this.savingResult = true;
    this.prestatairesService.upsertMissionResult(this.formResult.missionId, payload).subscribe({
      next: (saved) => {
        const mission = this.missions.find((m) => m.id === this.formResult.missionId);
        if (mission) {
          if (this.formResult.statut === 'EN_COURS') mission.statut = 'EN_COURS';
          if (this.formResult.statut === 'TERMINEE') mission.statut = 'TERMINEE';
          if (this.formResult.statut === 'ECHOUEE') mission.statut = 'ECHOUEE';
        }
        this.resultsByMissionId[this.formResult.missionId as number] = saved;
        this.closeResultModal();
        this.showBanner('Résultat mission enregistré.', 'success');
      },
      error: (err) => {
        this.savingResult = false;
        const msg = err?.error?.message || err?.error?.error || "Erreur lors de l'enregistrement du résultat.";
        this.showBanner(msg, 'danger');
      }
    });
  }

  onProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.formResult.preuveFile = file;
  }

  uploadProof(): void {
    if (!this.formResult.missionId) {
      this.showBanner('Mission obligatoire.', 'danger');
      return;
    }
    if (!this.formResult.preuveFile) {
      this.showBanner('Veuillez choisir un fichier.', 'danger');
      return;
    }
    this.uploadingProof = true;
    this.prestatairesService.uploadMissionProof(this.formResult.missionId, this.formResult.preuveFile).subscribe({
      next: (saved) => {
        this.uploadingProof = false;
        this.resultsByMissionId[this.formResult.missionId as number] = saved;
        this.showBanner('Preuve uploadée avec succès.', 'success');
      },
      error: (err) => {
        this.uploadingProof = false;
        const msg = err?.error?.message || err?.error?.error || "Erreur lors de l'upload.";
        this.showBanner(msg, 'danger');
      }
    });
  }

  showBanner(message: string, kind: 'success' | 'info' | 'danger'): void {
    this.banner = { kind, message };
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => (this.banner = null), 3500);
  }

  badgeClass(statut: MissionStatus): string {
    if (statut === 'TERMINEE') return 'badge bg-success-subtle text-success';
    if (statut === 'EN_COURS') return 'badge bg-warning-subtle text-warning';
    if (statut === 'ECHOUEE') return 'badge bg-danger-subtle text-danger';
    if (statut === 'ANNULEE') return 'badge bg-secondary-subtle text-secondary';
    return 'badge bg-info-subtle text-info';
  }

  isOverdue(m: Mission): boolean {
    if (m.statut === 'TERMINEE' || m.statut === 'ANNULEE') return false;
    if (!m.dateEcheance) return false;
    const t = new Date(m.dateEcheance).getTime();
    if (!Number.isFinite(t)) return false;
    return t < new Date().setHours(0, 0, 0, 0);
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  getSortIcon(key: string): string {
    if (this.missionSortKey !== key) return 'icon-minus text-muted small';
    return this.missionSortDir === 'asc' ? 'icon-chevron-up' : 'icon-chevron-down';
  }

  statusBadgeClassFintech(m: Mission): string {
    const s = (m.statut || '').toUpperCase();
    if (s === 'TERMINÉE' || s === 'CLÔTURÉE' || s === 'COMPLÉTÉE' || s === 'DONE' || s === 'TERMINER') return 'badge-soft-success';
    if (s === 'EN_COURS' || s === 'IN_PROGRESS' || s === 'AFFECTÉE' || s === 'ASSIGNÉE') return 'badge-soft-primary';
    if (s === 'EN_ATTENTE' || s === 'PENDING') return 'badge-soft-warning';
    if (s === 'ANNULÉE' || s === 'CANCELLED' || s === 'REJETÉE') return 'badge-soft-danger';
    return 'badge-soft-secondary';
  }

  statusLabel(m: Mission): string {
    if (this.isOverdue(m) && (m.statut === 'ASSIGNEE' || m.statut === 'EN_COURS')) return 'EN_RETARD';
    return m.statut;
  }

  statusBadgeClass(m: Mission): string {
    const s = this.statusLabel(m) as any;
    if (s === 'EN_RETARD') return 'badge bg-danger-subtle text-danger';
    return this.badgeClass(m.statut);
  }

  missionTypeLabel(value?: MissionType | null): string {
    if (!value) return '—';
    return this.missionTypes.find((m) => m.value === value)?.label || value;
  }

  missionTypeLabelOrInfer(m: Mission): string {
    if (m.typeMission) return this.missionTypeLabel(m.typeMission);
    const t = `${m.titre || ''} ${m.description || ''}`.toLowerCase();
    if (t.includes('assignation')) return this.missionTypeLabel('MISSION_ASSIGNATION');
    if (t.includes('recouvrement')) return this.missionTypeLabel('MISSION_RECOUVREMENT_JUDICIAIRE');
    if (t.includes('signification')) return this.missionTypeLabel('MISSION_SIGNIFICATION');
    if (t.includes('expertise')) return this.missionTypeLabel('MISSION_EXPERTISE');
    const procType = (m.procedureType || this.selectedProcedureFallback?.typeProcedure || '').toString();
    if (procType.startsWith('SAISIE')) return this.missionTypeLabel('MISSION_SIGNIFICATION');
    if (procType === 'ASSIGNATION') return this.missionTypeLabel('MISSION_ASSIGNATION');
    return this.missionTypeLabel('MISSION_RECOUVREMENT_JUDICIAIRE');
  }

  missionCodeOrAuto(m: Mission): string {
    if (m.codeMission) return m.codeMission;
    const year = m.createdAt ? new Date(m.createdAt).getFullYear() : new Date().getFullYear();
    const id = m.id ? String(m.id).padStart(4, '0') : '0000';
    return `MIS-${year}-${id}`;
  }

  displayProcedureType(): string {
    if (this.selectedMission?.procedureType) return this.selectedMission.procedureType;
    return this.selectedProcedureFallback?.typeProcedure || '—';
  }

  displayAffaireNumero(): string {
    if (this.selectedMission?.affaireNumero) return this.selectedMission.affaireNumero;
    return this.selectedProcedureFallback?.referenceTribunal || '—';
  }

  displayTribunal(): string {
    if (this.selectedMission?.procedureTribunal) return this.selectedMission.procedureTribunal;
    return this.selectedProcedureFallback?.tribunal || '—';
  }

  displayProcedureId(): string {
    const id = this.selectedMission?.procedureId || this.selectedProcedureFallback?.id;
    return id != null ? String(id) : '—';
  }

  private toIntOrUndefined(value: string): number | undefined {
    const v = (value ?? '').trim();
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return Math.trunc(n);
  }

  private toDecimalOrUndefined(value: string): number | undefined {
    const v = (value ?? '').trim().replace(',', '.');
    if (!v) return undefined;
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    return n;
  }
}
