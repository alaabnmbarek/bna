import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Facture, FactureImportResponse, FacturesService } from './factures.service';
import { CardComponent } from '../../theme/shared/components/card/card.component';
import { AuthService } from '../../auth/auth.service';
import { NotesHonorairesComponent } from '../notes-honoraires/notes-honoraires.component';
import { NoteHonoraire, NoteHonoraireService } from '../notes-honoraires/note-honoraire.service';
import { ProfileService, UserProfile } from '../../auth/profile.service';
import { Prestataire, PrestatairesService } from '../../prestataires/prestataires.service';
import { AosService } from '../../aos/aos.service';

type OptionalPaymentMode = 'Especes' | 'Virement' | 'Carte bancaire' | 'Cheque BCT';

interface OptionalFactureServiceLine {
  service: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
}

interface OptionalFactureModel {
  numero: string;
  date: string;
  prestataireId: number | null;
  clientNom: string;
  clientAdresse: string;
  clientTelephone: string;
  clientEmail: string;
  clientMatriculeFiscal: string;
  services: OptionalFactureServiceLine[];
  tva: number;
  remise: number;
  modePaiement: OptionalPaymentMode;
  statutPaiement: string;
  signature: string;
  cachet: string;
  chequeNumero: string;
  chequeBanqueEmettrice: string;
  chequeDate: string;
  chequeMontant: number | null;
  chequeBeneficiaire: string;
}

@Component({
  selector: 'app-factures',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, NotesHonorairesComponent],
  templateUrl: './factures.component.html',
  styleUrls: ['./factures.component.scss']
})
export class FacturesComponent implements OnInit {
  activeTab: 'FACTURES' | 'NOTES_HONORAIRES' | 'FACTURE_FACULTATIF' = 'FACTURES';
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

  showFactureDetail = false;
  selectedFactureDetail: Facture | null = null;
  selectedFacturePrestataire: any = null;

  showChequePreview = false;
  chequePreviewUrl: string | null = null;
  chequePreviewSafeUrl: SafeResourceUrl | null = null;
  chequePreviewImageUrl: string | null = null;
  private chequeBlob: Blob | null = null;
  private chequeFileName = 'cheque.pdf';
  chequeGenerating = false;
  chequeUploading = false;

  optionalFacture: OptionalFactureModel = this.getEmptyOptionalFacture();
  prestatairesList: Prestataire[] = [];
  prestatairesListLoading = false;
  showOptionalFacturePreview = false;
  optionalFacturePreviewUrl: string | null = null;
  optionalFacturePreviewImageUrl: string | null = null;
  private optionalFactureBlob: Blob | null = null;
  private optionalFactureFileName = 'facture-facultative.pdf';

  constructor(
    private facturesService: FacturesService,
    private noteService: NoteHonoraireService,
    private profileService: ProfileService,
    private prestatairesService: PrestatairesService,
    public auth: AuthService,
    private aos: AosService,
    private sanitizer: DomSanitizer
  ) {}

  get canDeleteFacture(): boolean {
    const r = this.auth.role();
    return ['ROLE_ADMIN', 'ROLE_RESPONSABLE_CONTENTIEUX', 'ADMIN', 'RESPONSABLE_CONTENTIEUX'].includes(r || '');
  }

  ngOnInit() {
    this.loadFactures();
    this.loadNotesOptions();
    this.loadPrestatairesList();
    this.profileService.profile$.subscribe(p => this.profile = p);
    if (this.auth.token()) this.profileService.getProfile().subscribe();
  }

  viewFacture(facture: Facture) {
    this.selectedFactureDetail = facture;
    this.showFactureDetail = true;
    if (facture.prestataireId) {
      this.prestatairesService.getPrestataire(facture.prestataireId).subscribe({
        next: (p) => this.selectedFacturePrestataire = p,
        error: () => this.selectedFacturePrestataire = null
      });
    }
  }

  closeFactureDetail() {
    this.showFactureDetail = false;
    this.selectedFactureDetail = null;
    this.selectedFacturePrestataire = null;
    this.closeChequePreview();
  }

  printFacture() {
    window.print();
  }

  async downloadFacturePdf() {
    const el = document.getElementById('printableFacture');
    if (!el) {
      this.showBanner('danger', 'Impossible de générer le PDF');
      return;
    }

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const canvas = await html2canvas(el as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        scrollX: 0,
        scrollY: -window.scrollY
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = canvas.height * (imgWidth / canvas.width);

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      const numero = this.selectedFactureDetail?.numero || 'facture';
      pdf.save(`${numero}.pdf`);
    } catch (err) {
      console.error('[DEBUG] Erreur génération PDF:', err);
      this.showBanner('danger', 'Erreur lors de la génération du PDF');
    }
  }

  downloadJustificatif(f: Facture) {
    if (!f?.id) return;
    this.facturesService.downloadFile(f.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = (f.fichierJustificatif && f.fichierJustificatif.includes('.'))
          ? f.fichierJustificatif
          : `${f.numero}.pdf`;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('[DEBUG] Erreur téléchargement justificatif:', err);
        this.showBanner('danger', 'Erreur lors du téléchargement du justificatif');
      }
    });
  }

  onJustificatifSelected(event: any, f: Facture | null) {
    if (!f?.id) return;
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;
    this.facturesService.uploadFile(f.id, file).subscribe({
      next: (updated) => {
        this.showBanner('success', 'Justificatif uploadé');
        if (this.selectedFactureDetail?.id === updated.id) {
          this.selectedFactureDetail.fichierJustificatif = updated.fichierJustificatif;
        }
        const idx = this.factures.findIndex(x => x.id === updated.id);
        if (idx >= 0) this.factures[idx] = { ...this.factures[idx], ...updated };
        this.applyFilters();
      },
      error: (err) => {
        console.error('[DEBUG] Erreur upload justificatif:', err);
        this.showBanner('danger', 'Erreur lors de l’upload du justificatif');
      }
    });
  }

  validateFacture(id: number) {
    if (!confirm('Voulez-vous vraiment valider cette facture ?')) return;
    const f = this.factures.find(x => x.id === id);
    if (f) {
      const updated = { ...f, statut: 'VALIDEE' as const };
      this.facturesService.update(id, updated).subscribe({
        next: () => {
          this.showBanner('success', 'Facture validée');
          this.loadFactures();
          if (this.selectedFactureDetail?.id === id) this.selectedFactureDetail.statut = 'VALIDEE';
        },
        error: () => this.showBanner('danger', 'Erreur lors de la validation')
      });
    }
  }

  markAsPaid(id: number) {
    if (!confirm('Marquer cette facture comme payée ?')) return;
    const f = this.factures.find(x => x.id === id);
    if (f) {
      const updated = { ...f, statut: 'PAYEE' as const, montantPaye: f.montantTtc, resteAPayer: 0 };
      this.facturesService.update(id, updated).subscribe({
        next: () => {
          this.showBanner('success', 'Facture marquée comme payée');
          this.loadFactures();
          if (this.selectedFactureDetail?.id === id) {
            this.selectedFactureDetail.statut = 'PAYEE';
            this.selectedFactureDetail.montantPaye = f.montantTtc;
            this.selectedFactureDetail.resteAPayer = 0;
          }
        },
        error: () => this.showBanner('danger', 'Erreur lors de la mise à jour')
      });
    }
  }

  isChequeBct(modePaiement: string | undefined | null): boolean {
    if (!modePaiement) return false;
    const m = modePaiement.trim().toLowerCase();
    return m === 'cheque bct' || m === 'chèque bct' || m === 'cheque_bct' || m === 'chèque_bct';
  }

  statusLabel(s: Facture['statut']): string {
    switch (s) {
      case 'EN_COURS': return 'En cours';
      case 'EN_ATTENTE': return 'En attente';
      case 'VALIDEE': return 'Validée';
      case 'PAYEE': return 'Payée';
      case 'REFUSEE': return 'Refusée';
      case 'CHEQUE_BCT_EN_COURS': return 'Paiement par chèque BCT en cours';
      default: return String(s || '');
    }
  }

  statusBadgeClass(s: Facture['statut']): string {
    switch (s) {
      case 'PAYEE': return 'app-status-badge--success';
      case 'VALIDEE': return 'app-status-badge--info';
      case 'EN_COURS': return 'app-status-badge--warning';
      case 'EN_ATTENTE': return 'app-status-badge--warning';
      case 'CHEQUE_BCT_EN_COURS': return 'app-status-badge--info';
      case 'REFUSEE': return 'app-status-badge--danger';
      default: return 'app-status-badge--neutral';
    }
  }

  statusIconClass(s: Facture['statut']): string {
    switch (s) {
      case 'EN_COURS': return 'icon-clock';
      case 'EN_ATTENTE': return 'icon-alert-circle';
      case 'VALIDEE': return 'icon-check-circle';
      case 'PAYEE': return 'icon-dollar-sign';
      case 'REFUSEE': return 'icon-x-circle';
      case 'CHEQUE_BCT_EN_COURS': return 'icon-file-text';
      default: return 'icon-info';
    }
  }

  onDetailModePaiementChange() {
    const f = this.selectedFactureDetail;
    if (!f) return;
    if (this.isChequeBct(f.modePaiement)) {
      if (f.chequeMontant == null) f.chequeMontant = f.montantTtc;
      if (!f.chequeDate) f.chequeDate = new Date().toISOString().split('T')[0];
    } else {
      this.closeChequePreview();
    }
  }

  onEditModePaiementChange() {
    const f = this.currentFacture;
    if (!f) return;
    if (this.isChequeBct(f.modePaiement)) {
      if (f.chequeMontant == null) f.chequeMontant = f.montantTtc;
      if (!f.chequeDate) f.chequeDate = new Date().toISOString().split('T')[0];
    } else {
      this.closeChequePreview();
    }
  }

  private chequeFieldsValid(f: Facture): boolean {
    return !!(f.chequeNumero && f.chequeNumero.trim()
      && f.chequeBanqueEmettrice && f.chequeBanqueEmettrice.trim()
      && f.chequeDate
      && f.chequeMontant != null && !Number.isNaN(Number(f.chequeMontant))
      && f.chequeBeneficiaire && f.chequeBeneficiaire.trim());
  }

  async generateCheque() {
    const f = this.selectedFactureDetail;
    if (!f?.id) return;
    await this.generateChequeFor(f);
  }

  async generateChequeFromEdit() {
    const f = this.currentFacture;
    if (!f?.id) {
      this.showBanner('danger', 'Enregistrez la facture avant de générer le chèque.');
      return;
    }
    await this.generateChequeFor(f);
  }

  private async generateChequeFor(f: Facture) {
    if (!this.isChequeBct(f.modePaiement)) {
      this.showBanner('danger', 'Veuillez choisir le mode de paiement "Chèque BCT".');
      return;
    }
    if (!this.chequeFieldsValid(f)) {
      this.showBanner('danger', 'Tous les champs du chèque sont obligatoires avant génération.');
      return;
    }
    this.chequeGenerating = true;
    const payload: Facture = { ...f, statut: 'CHEQUE_BCT_EN_COURS' };
    this.facturesService.update(f.id!, payload).subscribe({
      next: async (updated) => {
        this.patchFacture(updated);
        try {
          await this.buildChequePdf(updated);
          this.showChequePreview = true;
          this.showBanner('success', 'Chèque généré.');
        } catch (err) {
          console.error('[DEBUG] Erreur génération chèque:', err);
          this.showBanner('danger', 'Erreur lors de la génération du chèque.');
        } finally {
          this.chequeGenerating = false;
        }
      },
      error: (err) => {
        const status = err?.status;
        const apiMsg = err?.error?.message;
        if (status === 409) {
          this.showBanner('danger', apiMsg || 'Numéro de chèque déjà utilisé.');
        } else if (status === 400) {
          this.showBanner('danger', apiMsg || 'Champs du chèque invalides.');
        } else if (status === 403) {
          this.showBanner('danger', 'Accès refusé (403).');
        } else {
          this.showBanner('danger', apiMsg ? `Erreur (${status}): ${apiMsg}` : 'Erreur lors de la sauvegarde.');
        }
        this.chequeGenerating = false;
      }
    });
  }

  downloadCheque() {
    if (!this.chequeBlob) return;
    const url = URL.createObjectURL(this.chequeBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.chequeFileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  closeChequePreview() {
    this.showChequePreview = false;
    if (this.chequePreviewUrl) URL.revokeObjectURL(this.chequePreviewUrl);
    this.chequePreviewUrl = null;
    this.chequePreviewSafeUrl = null;
    this.chequePreviewImageUrl = null;
    this.chequeBlob = null;
  }

  closeOptionalFacturePreview() {
    this.showOptionalFacturePreview = false;
    if (this.optionalFacturePreviewUrl) URL.revokeObjectURL(this.optionalFacturePreviewUrl);
    this.optionalFacturePreviewUrl = null;
    this.optionalFacturePreviewImageUrl = null;
    this.optionalFactureBlob = null;
  }

  onChequeSigneSelected(event: any) {
    const f = this.selectedFactureDetail;
    if (!f?.id) return;
    this.uploadChequeSigneFor(f, event);
  }

  onChequeSigneSelectedFromEdit(event: any) {
    const f = this.currentFacture;
    if (!f?.id) {
      this.showBanner('danger', 'Enregistrez la facture avant d’uploader le chèque signé.');
      return;
    }
    this.uploadChequeSigneFor(f, event);
  }

  private uploadChequeSigneFor(f: Facture, event: any) {
    const file: File | undefined = event?.target?.files?.[0];
    if (!file) return;
    if (!this.isChequeBct(f.modePaiement)) {
      this.showBanner('danger', 'Mode de paiement différent de "Chèque BCT".');
      return;
    }
    this.chequeUploading = true;
    this.facturesService.uploadChequeSigne(f.id!, file).subscribe({
      next: (updated) => {
        this.patchFacture(updated);
        this.showBanner('success', 'Chèque signé uploadé.');
        this.chequeUploading = false;
      },
      error: (err) => {
        const status = err?.status;
        const apiMsg = err?.error?.message;
        this.showBanner('danger', apiMsg ? `Erreur (${status}): ${apiMsg}` : 'Erreur lors de l’upload du chèque signé.');
        this.chequeUploading = false;
      }
    });
  }

  downloadChequeSigne() {
    const f = this.selectedFactureDetail;
    if (!f?.id) return;
    this.facturesService.downloadChequeSigne(f.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cheque-signe-${f.numero}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showBanner('danger', 'Erreur lors du téléchargement du chèque signé.')
    });
  }

  private patchFacture(updated: Facture) {
    const idx = this.factures.findIndex(x => x.id === updated.id);
    if (idx >= 0) this.factures[idx] = { ...this.factures[idx], ...updated };
    if (this.selectedFactureDetail?.id === updated.id) {
      this.selectedFactureDetail = { ...this.selectedFactureDetail, ...updated };
    }
    if (this.currentFacture?.id === updated.id) {
      this.currentFacture = { ...this.currentFacture, ...updated };
    }
    this.applyFilters();
  }

  private async buildChequePdf(f: Facture) {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    const logo = await this.loadImageAsDataUrl('assets/images/logo-bna-new.png.jpg');
    const montant = Number(f.chequeMontant ?? f.montantTtc ?? 0);
    const montantLettres = this.amountToWordsFr(montant);
    const chequeNumero = (f.chequeNumero || '').trim();
    const banque = (f.chequeBanqueEmettrice || '').trim() || 'BCT';
    const beneficiaire = (f.chequeBeneficiaire || '').trim();
    const dateCheque = (f.chequeDate || '').trim();
    const micrNumero = (chequeNumero || '0').replace(/\D/g, '').padStart(6, '0').slice(-6);
    const micr = `C ${micrNumero} C 001 0000000000 000000000`;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.width = '980px';
    wrapper.style.background = '#fff';
    wrapper.style.padding = '0';
    wrapper.style.fontFamily = 'Arial, sans-serif';

    wrapper.innerHTML = `
      <div style="
        border-radius: 18px;
        overflow:hidden;
        border: 1px solid rgba(15,23,42,0.18);
        box-shadow: 0 18px 45px rgba(15,23,42,0.14);
        background:
          radial-gradient(circle at 12% 20%, rgba(14,116,144,0.12), transparent 55%),
          radial-gradient(circle at 82% 70%, rgba(2,132,199,0.10), transparent 55%),
          repeating-linear-gradient(135deg, rgba(2,132,199,0.05) 0 6px, rgba(2,132,199,0.02) 6px 12px),
          #ffffff;
      ">
        <div style="position:relative; padding: 18px 18px 10px 18px;">
          <div style="
            position:absolute; inset: -40px -60px auto -60px; height: 160px;
            background: linear-gradient(90deg, rgba(2,132,199,0.20), rgba(14,116,144,0.05));
            transform: rotate(-3deg);
          "></div>

          <div style="position:absolute; inset: 0; pointer-events:none; opacity:0.08; font-weight:900; letter-spacing: 2px;">
            <div style="position:absolute; left: 24px; top: 54px; font-size: 34px; transform: rotate(-8deg);">BNA BANK</div>
            <div style="position:absolute; right: 26px; top: 96px; font-size: 26px; transform: rotate(-8deg);">SECURED</div>
          </div>

          <div style="position:relative; display:flex; align-items:flex-start; justify-content:space-between; gap: 14px;">
            <div style="display:flex; align-items:center; gap: 12px;">
              <div style="
                width: 72px; height: 56px;
                border-radius: 12px;
                background: rgba(255,255,255,0.82);
                border: 1px solid rgba(15,23,42,0.10);
                display:flex; align-items:center; justify-content:center;
              ">
                <img src="${logo}" style="height: 44px; object-fit:contain;" />
              </div>
              <div style="line-height:1.1;">
                <div style="font-weight:900; font-size:16px; color: rgba(2,132,199,0.95);">BNA BANK</div>
                <div style="color:rgba(15,23,42,0.70); font-size:12px; font-weight:700;">Chèque bancaire</div>
                <div style="color:rgba(15,23,42,0.62); font-size:11px; font-weight:650;">Facture N° ${this.escapeHtml(f.numero || '')}</div>
              </div>
            </div>

            <div style="
              min-width: 290px;
              background: rgba(255,255,255,0.84);
              border: 1px solid rgba(15,23,42,0.10);
              border-radius: 14px;
              padding: 10px 12px;
              text-align:right;
            ">
              <div style="display:flex; align-items:center; justify-content:space-between; gap: 10px;">
                <div style="text-align:left;">
                  <div style="font-size:10px; color:rgba(15,23,42,0.60); font-weight:700;">Banque</div>
                  <div style="font-weight:900; font-size:13px;">${this.escapeHtml(banque)}</div>
                </div>
                <div>
                  <div style="font-size:10px; color:rgba(15,23,42,0.60); font-weight:700;">N° chèque</div>
                  <div style="font-weight:950; font-size:16px; letter-spacing: 1px;">${this.escapeHtml(chequeNumero)}</div>
                </div>
              </div>
              <div style="margin-top: 8px; display:flex; gap: 10px; justify-content:flex-end; align-items:flex-end;">
                <div>
                  <div style="font-size:10px; color:rgba(15,23,42,0.60); font-weight:700;">Date</div>
                  <div style="font-weight:850; font-size:12px;">${this.escapeHtml(dateCheque)}</div>
                </div>
                <div style="
                  border-left: 1px solid rgba(15,23,42,0.10);
                  padding-left: 10px;
                  text-align:right;
                ">
                  <div style="font-size:10px; color:rgba(15,23,42,0.60); font-weight:700;">Montant</div>
                  <div style="font-weight:1000; font-size:18px;">${montant.toFixed(3)} DT</div>
                </div>
              </div>
            </div>
          </div>

          <div style="position:relative; margin-top: 14px; display:grid; grid-template-columns: 1fr 260px; gap: 14px;">
            <div style="
              background: rgba(255,255,255,0.85);
              border: 1px solid rgba(15,23,42,0.10);
              border-radius: 16px;
              padding: 12px;
            ">
              <div style="font-weight:900; font-size:11px; color:rgba(15,23,42,0.70); letter-spacing:0.4px;">PAYEZ À L’ORDRE DE</div>
              <div style="margin-top: 6px; font-weight:950; font-size:16px;">${this.escapeHtml(beneficiaire)}</div>
              <div style="margin-top: 10px; height: 1px; background: rgba(15,23,42,0.14);"></div>
              <div style="margin-top: 10px; font-weight:900; font-size:11px; color:rgba(15,23,42,0.70); letter-spacing:0.4px;">MONTANT EN LETTRES</div>
              <div style="margin-top: 6px; font-weight:800; font-size:13px; color:rgba(15,23,42,0.90);">${this.escapeHtml(montantLettres)}</div>
            </div>

            <div style="
              background: rgba(255,255,255,0.85);
              border: 1px solid rgba(15,23,42,0.10);
              border-radius: 16px;
              padding: 12px;
              display:flex;
              flex-direction:column;
              justify-content:space-between;
              gap: 10px;
            ">
              <div style="
                border: 1px dashed rgba(15,23,42,0.20);
                border-radius: 14px;
                padding: 10px;
                background: linear-gradient(180deg, rgba(2,132,199,0.06), rgba(14,116,144,0.02));
              ">
                <div style="font-size:10px; color:rgba(15,23,42,0.60); font-weight:800;">Zone montant</div>
                <div style="margin-top:6px; font-weight:1000; font-size:22px; text-align:right;">${montant.toFixed(3)} DT</div>
              </div>

              <div style="
                border: 1px solid rgba(15,23,42,0.10);
                border-radius: 14px;
                padding: 10px;
              ">
                <div style="font-size:10px; color:rgba(15,23,42,0.60); font-weight:800;">Signature</div>
                <div style="margin-top: 22px; border-top: 1px solid rgba(15,23,42,0.20);"></div>
              </div>

              <div style="display:flex; gap: 10px; align-items:center;">
                <div style="flex:1; border-radius: 14px; overflow:hidden; border: 1px solid rgba(15,23,42,0.10); background: rgba(255,255,255,0.88);">
                  <div style="padding: 8px 10px; display:flex; align-items:center; justify-content:space-between;">
                    <div style="font-size:10px; color:rgba(15,23,42,0.60); font-weight:800;">Sécurité</div>
                    <div style="font-size:10px; color:rgba(2,132,199,0.92); font-weight:900;">Micro-print</div>
                  </div>
                  <div style="height: 14px; background: repeating-linear-gradient(90deg, rgba(15,23,42,0.14) 0 1px, transparent 1px 2px); opacity:0.28;"></div>
                </div>
                <div style="
                  width: 54px; height: 54px;
                  border-radius: 14px;
                  border: 1px solid rgba(15,23,42,0.10);
                  background: rgba(255,255,255,0.88);
                  display:flex; align-items:center; justify-content:center;
                  font-size:10px; font-weight:900; color:rgba(15,23,42,0.50);
                ">QR</div>
              </div>
            </div>
          </div>
        </div>

        <div style="padding: 10px 18px 16px 18px;">
          <div style="display:flex; justify-content:space-between; gap: 14px; align-items:flex-end;">
            <div style="flex:1;">
              <div style="font-size:10px; color:rgba(15,23,42,0.55); font-weight:800;">Ligne MICR</div>
              <div style="
                margin-top: 6px;
                background: rgba(255,255,255,0.90);
                border: 1px solid rgba(15,23,42,0.10);
                border-radius: 14px;
                padding: 10px 12px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                font-size: 15px;
                letter-spacing: 1px;
                color: rgba(15,23,42,0.90);
              ">${this.escapeHtml(micr)}</div>
            </div>
            <div style="min-width: 250px; text-align:right;">
              <div style="font-size:10px; color:rgba(15,23,42,0.55); font-weight:800;">Référence</div>
              <div style="margin-top:6px; font-weight:900; font-size:12px;">${this.escapeHtml(f.referenceLien || '')} (${this.escapeHtml(String(f.typeLien || ''))})</div>
              <div style="margin-top: 6px; color:rgba(15,23,42,0.55); font-size:10px; font-weight:750;">Document généré automatiquement</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
    const canvas = await html2canvas(wrapper as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    document.body.removeChild(wrapper);

    const imgData = canvas.toDataURL('image/png');
    this.chequePreviewImageUrl = imgData;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [210, 100] });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const imgW = pageWidth - margin * 2;
    const imgH = canvas.height * (imgW / canvas.width);
    const y = Math.max(margin, (pageHeight - imgH) / 2);
    pdf.addImage(imgData, 'PNG', margin, y, imgW, imgH, undefined, 'FAST');

    this.chequeBlob = pdf.output('blob');
    this.chequeFileName = `cheque-${f.numero || 'facture'}.pdf`;
    if (this.chequePreviewUrl) URL.revokeObjectURL(this.chequePreviewUrl);
    this.chequePreviewUrl = URL.createObjectURL(this.chequeBlob);
    this.chequePreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.chequePreviewUrl);
  }

  private async loadImageAsDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read error'));
      reader.readAsDataURL(blob);
    });
  }

  private escapeHtml(v: string): string {
    return v
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private amountToWordsFr(amount: number): string {
    const total = Math.round((amount + Number.EPSILON) * 1000);
    const dinars = Math.floor(total / 1000);
    const millimes = total % 1000;
    const dinarsTxt = this.intToWordsFr(dinars);
    const millimesTxt = millimes > 0 ? ` et ${this.intToWordsFr(millimes)} millimes` : '';
    return `${dinarsTxt} dinars${millimesTxt}`;
  }

  private intToWordsFr(n: number): string {
    const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

    const underHundred = (x: number): string => {
      if (x < 17) return units[x];
      if (x < 20) return `dix-${units[x - 10]}`;
      const t = Math.floor(x / 10);
      const u = x % 10;
      if (t === 7 || t === 9) {
        const base = tens[t];
        const rest = x - (t * 10);
        return rest === 1 ? `${base} et ${underHundred(rest)}` : `${base}-${underHundred(rest)}`;
      }
      const base = tens[t];
      if (u === 0) return t === 8 ? `${base}s` : base;
      if (u === 1 && t !== 8) return `${base} et un`;
      return `${base}-${units[u]}`;
    };

    const underThousand = (x: number): string => {
      if (x < 100) return underHundred(x);
      const h = Math.floor(x / 100);
      const r = x % 100;
      const hTxt = h === 1 ? 'cent' : `${units[h]} cent${r === 0 ? 's' : ''}`;
      return r === 0 ? hTxt : `${hTxt} ${underHundred(r)}`;
    };

    if (n < 0) return `moins ${this.intToWordsFr(-n)}`;
    if (n < 1000) return underThousand(n);
    if (n < 1_000_000) {
      const k = Math.floor(n / 1000);
      const r = n % 1000;
      const kTxt = k === 1 ? 'mille' : `${underThousand(k)} mille`;
      return r === 0 ? kTxt : `${kTxt} ${underThousand(r)}`;
    }
    if (n < 1_000_000_000) {
      const m = Math.floor(n / 1_000_000);
      const r = n % 1_000_000;
      const mTxt = m === 1 ? 'un million' : `${this.intToWordsFr(m)} millions`;
      return r === 0 ? mTxt : `${mTxt} ${this.intToWordsFr(r)}`;
    }
    return String(n);
  }

  validateNoteInTab(id: number) {
    if (!confirm('Voulez-vous vraiment valider cette note ? Une facture sera automatiquement générée.')) return;
    this.noteService.validate(id).subscribe({
      next: () => {
        this.showBanner('success', 'Note validée et facture générée');
        this.loadNotesOptions();
        this.loadFactures(); // Recharger les factures pour voir la nouvelle
      },
      error: (err) => {
        console.error('Erreur validation note:', err);
        this.showBanner('danger', 'Erreur lors de la validation');
      }
    });
  }

  setTab(tab: 'FACTURES' | 'NOTES_HONORAIRES' | 'FACTURE_FACULTATIF') {
    this.activeTab = tab;
    if (tab === 'FACTURES') {
      this.loadFactures();
    }
    setTimeout(() => this.aos.refresh(), 0);
  }

  onFactureGeneratedFromNote() {
    console.log('[DEBUG] Facture générée, retour à l\'onglet Factures');
    this.activeTab = 'FACTURES';
    this.loadFactures();
    setTimeout(() => this.aos.refresh(), 0);
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
      referenceLien: '',
      prestations: [],
      remarques: '',
      conditionsPaiement: 'Paiement à réception de facture par virement bancaire.',
      modePaiement: 'Virement'
    };
  }

  private getEmptyOptionalFacture(): OptionalFactureModel {
    const today = new Date().toISOString().split('T')[0];
    return {
      numero: this.generateOptionalFactureNumero(),
      date: today,
      prestataireId: null,
      clientNom: '',
      clientAdresse: '',
      clientTelephone: '',
      clientEmail: '',
      clientMatriculeFiscal: '',
      services: [{ service: '', description: '', quantite: 1, prixUnitaire: 0 }],
      tva: 19,
      remise: 0,
      modePaiement: 'Virement',
      statutPaiement: 'Non payée',
      signature: '',
      cachet: '',
      chequeNumero: '',
      chequeBanqueEmettrice: 'BCT',
      chequeDate: today,
      chequeMontant: null,
      chequeBeneficiaire: ''
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

  private generateOptionalFactureNumero(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `FACF-${y}${m}${day}-${rand}`;
  }

  private loadPrestatairesList() {
    this.prestatairesListLoading = true;
    this.prestatairesService.listPrestataires().subscribe({
      next: (list) => {
        this.prestatairesList = (list || []).slice().sort((a, b) => {
          const an = `${a.nom || ''} ${a.prenom || ''}`.trim().toLowerCase();
          const bn = `${b.nom || ''} ${b.prenom || ''}`.trim().toLowerCase();
          return an.localeCompare(bn);
        });
        this.prestatairesListLoading = false;
      },
      error: () => {
        this.prestatairesList = [];
        this.prestatairesListLoading = false;
      }
    });
  }

  onOptionalPrestataireSelected() {
    const id = this.optionalFacture.prestataireId;
    const p = id != null ? (this.prestatairesList.find(x => x.id === id) || null) : null;
    if (!p) {
      this.optionalFacture.clientNom = '';
      this.optionalFacture.clientAdresse = '';
      this.optionalFacture.clientTelephone = '';
      this.optionalFacture.clientEmail = '';
      this.optionalFacture.clientMatriculeFiscal = '';
      return;
    }

    const name = `${p.nom || ''} ${p.prenom || ''}`.trim();
    const displayName = p.cabinet ? `${name}${name ? ' — ' : ''}${p.cabinet}` : name;
    this.optionalFacture.clientNom = displayName || name;
    this.optionalFacture.clientAdresse = p.adresse || '';
    this.optionalFacture.clientTelephone = p.telephone || '';
    this.optionalFacture.clientEmail = p.email || '';
    this.optionalFacture.clientMatriculeFiscal = p.matriculeFiscale || '';

    if (!this.optionalFacture.chequeBeneficiaire || !this.optionalFacture.chequeBeneficiaire.trim()) {
      this.optionalFacture.chequeBeneficiaire = displayName || name;
    }
  }

  optionalLineTotal(l: OptionalFactureServiceLine): number {
    const q = Number(l?.quantite ?? 0);
    const pu = Number(l?.prixUnitaire ?? 0);
    if (Number.isNaN(q) || Number.isNaN(pu)) return 0;
    return q * pu;
  }

  optionalTotalHt(): number {
    return (this.optionalFacture?.services || []).reduce((sum, l) => sum + this.optionalLineTotal(l), 0);
  }

  optionalTotalAfterRemise(): number {
    const ht = this.optionalTotalHt();
    const remise = Number(this.optionalFacture?.remise ?? 0);
    if (Number.isNaN(remise) || remise <= 0) return ht;
    const r = Math.min(100, Math.max(0, remise));
    return ht * (1 - r / 100);
  }

  optionalTvaAmount(): number {
    const base = this.optionalTotalAfterRemise();
    const tva = Number(this.optionalFacture?.tva ?? 0);
    if (Number.isNaN(tva) || tva <= 0) return 0;
    return base * (tva / 100);
  }

  optionalTotalTtc(): number {
    return this.optionalTotalAfterRemise() + this.optionalTvaAmount();
  }

  addOptionalServiceLine() {
    this.optionalFacture.services.push({ service: '', description: '', quantite: 1, prixUnitaire: 0 });
  }

  removeOptionalServiceLine(i: number) {
    if (this.optionalFacture.services.length <= 1) return;
    this.optionalFacture.services.splice(i, 1);
  }

  resetOptionalFacture() {
    this.optionalFacture = this.getEmptyOptionalFacture();
    this.closeOptionalFacturePreview();
    this.closeChequePreview();
  }

  onOptionalModePaiementChange() {
    if (this.optionalFacture.modePaiement === 'Cheque BCT') {
      if (!this.optionalFacture.chequeDate) this.optionalFacture.chequeDate = new Date().toISOString().split('T')[0];
      if (this.optionalFacture.chequeMontant == null) this.optionalFacture.chequeMontant = this.optionalTotalTtc();
    }
  }

  async generateOptionalFacture() {
    try {
      await this.buildOptionalFacturePdf(this.optionalFacture);
      this.showOptionalFacturePreview = true;
      this.showBanner('success', 'Facture facultative générée.');
    } catch (err) {
      console.error('[DEBUG] Erreur génération facture facultative:', err);
      this.showBanner('danger', 'Erreur lors de la génération de la facture facultative.');
    }
  }

  downloadOptionalFacture() {
    if (!this.optionalFactureBlob) return;
    const url = URL.createObjectURL(this.optionalFactureBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.optionalFactureFileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  printOptionalFacture() {
    if (!this.optionalFacturePreviewImageUrl) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>${this.escapeHtml(this.optionalFacture.numero || 'facture')}</title></head><body style="margin:0; padding:0;"><img src="${this.optionalFacturePreviewImageUrl}" style="width:100%; height:auto;" /></body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }

  async generateChequeFromOptionalFacture() {
    if (this.optionalFacture.modePaiement !== 'Cheque BCT') {
      this.showBanner('danger', 'Veuillez choisir le mode de paiement "Chèque BCT".');
      return;
    }
    if (!this.optionalFacture.chequeNumero.trim()
      || !this.optionalFacture.chequeBanqueEmettrice.trim()
      || !this.optionalFacture.chequeDate.trim()
      || (this.optionalFacture.chequeMontant == null || Number.isNaN(Number(this.optionalFacture.chequeMontant)))
      || !this.optionalFacture.chequeBeneficiaire.trim()) {
      this.showBanner('danger', 'Tous les champs du chèque sont obligatoires avant génération.');
      return;
    }

    this.chequeGenerating = true;
    try {
      const pseudo: Facture = {
        ...this.getEmptyFacture(),
        numero: this.optionalFacture.numero,
        montantHt: this.optionalTotalAfterRemise(),
        tva: Number(this.optionalFacture.tva || 0),
        montantTtc: this.optionalTotalTtc(),
        montantPaye: 0,
        resteAPayer: this.optionalTotalTtc(),
        statut: 'CHEQUE_BCT_EN_COURS',
        dateFacture: this.optionalFacture.date,
        referenceLien: this.optionalFacture.clientNom,
        modePaiement: 'Cheque BCT',
        chequeNumero: this.optionalFacture.chequeNumero,
        chequeBanqueEmettrice: this.optionalFacture.chequeBanqueEmettrice,
        chequeDate: this.optionalFacture.chequeDate,
        chequeMontant: Number(this.optionalFacture.chequeMontant),
        chequeBeneficiaire: this.optionalFacture.chequeBeneficiaire
      };
      await this.buildChequePdf(pseudo);
      this.showChequePreview = true;
      this.showBanner('success', 'Chèque généré.');
    } catch (err) {
      console.error('[DEBUG] Erreur génération chèque (facture facultative):', err);
      this.showBanner('danger', 'Erreur lors de la génération du chèque.');
    } finally {
      this.chequeGenerating = false;
    }
  }

  private async buildOptionalFacturePdf(model: OptionalFactureModel) {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);

    const logo = await this.loadImageAsDataUrl('assets/images/logo-bna-new.png.jpg');

    const services = (model.services || []).map((l, idx) => {
      const total = this.optionalLineTotal(l);
      return `
        <tr>
          <td style="padding:10px 8px; border-bottom:1px solid rgba(15,23,42,0.08);">${idx + 1}</td>
          <td style="padding:10px 8px; border-bottom:1px solid rgba(15,23,42,0.08);">
            <div style="font-weight:900;">${this.escapeHtml(l.service || '')}</div>
            <div style="color:rgba(15,23,42,0.65); font-size:11px; margin-top:2px;">${this.escapeHtml(l.description || '')}</div>
          </td>
          <td style="padding:10px 8px; border-bottom:1px solid rgba(15,23,42,0.08); text-align:center;">${Number(l.quantite || 0)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid rgba(15,23,42,0.08); text-align:right;">${Number(l.prixUnitaire || 0).toFixed(3)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid rgba(15,23,42,0.08); text-align:right; font-weight:900;">${total.toFixed(3)}</td>
        </tr>
      `;
    }).join('');

    const ht = this.optionalTotalHt();
    const afterRemise = this.optionalTotalAfterRemise();
    const remise = Number(model.remise || 0);
    const tvaRate = Number(model.tva || 0);
    const tvaAmount = this.optionalTvaAmount();
    const ttc = this.optionalTotalTtc();

    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-99999px';
    wrapper.style.top = '0';
    wrapper.style.width = '920px';
    wrapper.style.background = '#ffffff';
    wrapper.style.fontFamily = 'Arial, sans-serif';
    wrapper.style.padding = '18px';

    wrapper.innerHTML = `
      <div style="border: 1px solid rgba(15,23,42,0.10); border-radius: 18px; overflow:hidden;">
        <div style="padding: 18px 18px 14px 18px; background: linear-gradient(90deg, rgba(2,132,199,0.10), rgba(14,116,144,0.03));">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; gap: 14px;">
            <div style="display:flex; gap: 12px; align-items:center;">
              <div style="width: 72px; height: 56px; border-radius: 14px; background: rgba(255,255,255,0.9); border:1px solid rgba(15,23,42,0.10); display:flex; align-items:center; justify-content:center;">
                <img src="${logo}" style="height:44px; object-fit:contain;" />
              </div>
              <div>
                <div style="font-weight:1000; font-size:18px; color: rgba(2,132,199,0.95);">BNA BANK</div>
                <div style="font-weight:800; color: rgba(15,23,42,0.70); font-size:12px;">Facture</div>
              </div>
            </div>
            <div style="text-align:right; background: rgba(255,255,255,0.88); border:1px solid rgba(15,23,42,0.10); border-radius: 14px; padding: 10px 12px; min-width: 260px;">
              <div style="font-size:11px; color:rgba(15,23,42,0.60); font-weight:800;">N° Facture</div>
              <div style="font-weight:1000; font-size:16px;">${this.escapeHtml(model.numero || '')}</div>
              <div style="margin-top:8px; font-size:11px; color:rgba(15,23,42,0.60); font-weight:800;">Date</div>
              <div style="font-weight:900; font-size:13px;">${this.escapeHtml(model.date || '')}</div>
            </div>
          </div>
        </div>

        <div style="padding: 16px 18px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="border:1px solid rgba(15,23,42,0.10); border-radius: 16px; padding: 12px; background: rgba(248,250,252,0.55);">
              <div style="font-weight:900; font-size:12px; color: rgba(15,23,42,0.75);">ÉMETTEUR</div>
              <div style="margin-top:8px; font-weight:1000;">BNA BANK - Direction du Contentieux</div>
              <div style="margin-top:4px; color: rgba(15,23,42,0.65); font-size:12px;">Immeuble BNA, Avenue Mohamed V</div>
              <div style="color: rgba(15,23,42,0.65); font-size:12px;">1002 Tunis, Tunisie</div>
            </div>
            <div style="border:1px solid rgba(15,23,42,0.10); border-radius: 16px; padding: 12px; background: rgba(248,250,252,0.55);">
              <div style="font-weight:900; font-size:12px; color: rgba(15,23,42,0.75);">PRESTATAIRE</div>
              <div style="margin-top:8px; font-weight:1000;">${this.escapeHtml(model.clientNom || '')}</div>
              <div style="margin-top:4px; color: rgba(15,23,42,0.65); font-size:12px;">${this.escapeHtml(model.clientAdresse || '')}</div>
              <div style="margin-top:8px; display:grid; grid-template-columns: 1fr 1fr; gap: 8px; color: rgba(15,23,42,0.70); font-size:12px;">
                <div><span style="font-weight:900;">Tél:</span> ${this.escapeHtml(model.clientTelephone || '')}</div>
                <div><span style="font-weight:900;">Email:</span> ${this.escapeHtml(model.clientEmail || '')}</div>
              </div>
              <div style="margin-top:6px; color: rgba(15,23,42,0.70); font-size:12px;">
                <span style="font-weight:900;">Matricule fiscal:</span> ${this.escapeHtml(model.clientMatriculeFiscal || '')}
              </div>
            </div>
          </div>

          <div style="margin-top: 14px; border:1px solid rgba(15,23,42,0.10); border-radius: 16px; overflow:hidden;">
            <div style="padding: 10px 12px; background: rgba(2,132,199,0.06); font-weight:1000;">Détails des services</div>
            <table style="width:100%; border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(15,23,42,0.03);">
                  <th style="text-align:left; padding:10px 8px; font-size:11px; color:rgba(15,23,42,0.70);">#</th>
                  <th style="text-align:left; padding:10px 8px; font-size:11px; color:rgba(15,23,42,0.70);">Service</th>
                  <th style="text-align:center; padding:10px 8px; font-size:11px; color:rgba(15,23,42,0.70);">Qté</th>
                  <th style="text-align:right; padding:10px 8px; font-size:11px; color:rgba(15,23,42,0.70);">Prix Unit. HT</th>
                  <th style="text-align:right; padding:10px 8px; font-size:11px; color:rgba(15,23,42,0.70);">Total HT</th>
                </tr>
              </thead>
              <tbody>
                ${services || `<tr><td colspan="5" style="padding:14px 10px; text-align:center; color:rgba(15,23,42,0.55);">Aucun service</td></tr>`}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 14px; display:grid; grid-template-columns: 1fr 320px; gap: 12px;">
            <div style="border:1px solid rgba(15,23,42,0.10); border-radius: 16px; padding: 12px;">
              <div style="font-weight:1000; margin-bottom: 8px;">Paiement</div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size:12px; color: rgba(15,23,42,0.75);">
                <div><span style="font-weight:900;">Mode:</span> ${this.escapeHtml(model.modePaiement || '')}</div>
                <div><span style="font-weight:900;">Statut:</span> ${this.escapeHtml(model.statutPaiement || '')}</div>
              </div>
            </div>

            <div style="border:1px solid rgba(15,23,42,0.10); border-radius: 16px; padding: 12px; background: rgba(248,250,252,0.55);">
              <div style="display:flex; justify-content:space-between; font-size:12px; padding: 6px 0;">
                <span style="color:rgba(15,23,42,0.70); font-weight:800;">Total HT</span>
                <span style="font-weight:1000;">${ht.toFixed(3)} DT</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:12px; padding: 6px 0;">
                <span style="color:rgba(15,23,42,0.70); font-weight:800;">Remise (${remise.toFixed(2)}%)</span>
                <span style="font-weight:1000;">-${(ht - afterRemise).toFixed(3)} DT</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:12px; padding: 6px 0;">
                <span style="color:rgba(15,23,42,0.70); font-weight:800;">TVA (${tvaRate.toFixed(2)}%)</span>
                <span style="font-weight:1000;">${tvaAmount.toFixed(3)} DT</span>
              </div>
              <div style="height:1px; background: rgba(15,23,42,0.12); margin: 8px 0;"></div>
              <div style="display:flex; justify-content:space-between; font-size:14px; padding: 6px 0;">
                <span style="color:rgba(15,23,42,0.80); font-weight:1000;">TOTAL TTC</span>
                <span style="font-weight:1100; color: rgba(2,132,199,0.95);">${ttc.toFixed(3)} DT</span>
              </div>
            </div>
          </div>

          <div style="margin-top: 14px; display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="border:1px solid rgba(15,23,42,0.10); border-radius: 16px; padding: 12px;">
              <div style="font-weight:1000; margin-bottom: 10px;">Signature</div>
              <div style="height: 52px; border-bottom:1px solid rgba(15,23,42,0.20);"></div>
              <div style="margin-top: 8px; font-size:12px; color:rgba(15,23,42,0.70); font-weight:800;">${this.escapeHtml(model.signature || '')}</div>
            </div>
            <div style="border:1px solid rgba(15,23,42,0.10); border-radius: 16px; padding: 12px;">
              <div style="font-weight:1000; margin-bottom: 10px;">Cachet</div>
              <div style="height: 52px; border:1px dashed rgba(15,23,42,0.22); border-radius: 14px;"></div>
              <div style="margin-top: 8px; font-size:12px; color:rgba(15,23,42,0.70); font-weight:800;">${this.escapeHtml(model.cachet || '')}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);
    const canvas = await html2canvas(wrapper as HTMLElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    document.body.removeChild(wrapper);

    const imgData = canvas.toDataURL('image/png');
    this.optionalFacturePreviewImageUrl = imgData;

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * (imgWidth / canvas.width);
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    this.optionalFactureBlob = pdf.output('blob');
    this.optionalFactureFileName = `facture-facultative-${model.numero || 'facture'}.pdf`;
    if (this.optionalFacturePreviewUrl) URL.revokeObjectURL(this.optionalFacturePreviewUrl);
    this.optionalFacturePreviewUrl = URL.createObjectURL(this.optionalFactureBlob);
  }

  loadFactures() {
    this.loading = true;
    console.log('[DEBUG] Chargement des factures...');
    this.facturesService.getAll().subscribe({
      next: (data) => {
        console.log('[DEBUG] Factures reçues:', data);
        this.factures = data;
        this.applyFilters();
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: (err) => {
        console.error('[DEBUG] Erreur chargement factures:', err);
        const status = err?.status;
        const apiMsg = err?.error?.message;
        if (status === 0) {
          this.showBanner('danger', 'Impossible de joindre le serveur (backend indisponible ou proxy non configuré)');
        } else if (status === 401) {
          this.showBanner('danger', 'Session expirée (401). Veuillez vous reconnecter.');
        } else if (status === 403) {
          this.showBanner('danger', 'Accès refusé (403)');
        } else {
          this.showBanner('danger', apiMsg ? `Erreur (${status}): ${apiMsg}` : 'Erreur lors du chargement des factures');
        }
        this.loading = false;
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  applyFilters() {
    if (!this.factures) {
      this.filteredFactures = [];
      return;
    }
    this.filteredFactures = this.factures.filter(f => {
      const s = this.search.toLowerCase();
      const matchSearch = this.search === '' || 
        (f.numero && f.numero.toLowerCase().includes(s)) || 
        (f.referenceLien && f.referenceLien.toLowerCase().includes(s));
      
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
    this.closeChequePreview();
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
        setTimeout(() => this.aos.refresh(), 0);
      },
      error: () => {
        this.notesOptions = [];
        this.notesLoading = false;
        this.showBanner('danger', 'Impossible de charger les notes d\'honoraires');
        setTimeout(() => this.aos.refresh(), 0);
      }
    });
  }

  onNoteSelected() {
    if (!this.selectedNoteId) return;
    const note = this.notesOptions.find(n => n.id === this.selectedNoteId);
    if (!note) return;

    this.currentFacture.numero = `FAC-${note.numero}`;
    this.currentFacture.montantHt = Number(note.montantHonoraires || 0) + Number(note.fraisAdministratifs || 0);
    this.currentFacture.tva = 19.0;
    this.currentFacture.montantTtc = Number(note.total || 0);
    this.currentFacture.montantPaye = 0;
    this.currentFacture.resteAPayer = Number(note.total || 0);
    this.currentFacture.statut = 'VALIDEE';
    this.currentFacture.dateFacture = new Date().toISOString().split('T')[0];
    this.currentFacture.typeLien = note.typeLien;
    this.currentFacture.referenceLien = note.referenceLien;
    this.currentFacture.fichierJustificatif = note.fichierJustificatif;
    this.currentFacture.prestataireId = note.prestataireId;
    this.currentFacture.remarques = note.remarques;
    this.currentFacture.noteHonoraireId = note.id;

    if (note.prestations && note.prestations.length > 0) {
      this.currentFacture.prestations = note.prestations.map(p => ({
        type: p.type,
        description: p.description,
        quantite: 1,
        prixUnitaire: p.montant,
        montant: p.montant
      }));
    } else {
      this.currentFacture.prestations = [{
        type: 'HONORAIRES',
        description: 'Prestation forfaitaire',
        quantite: 1,
        prixUnitaire: this.currentFacture.montantHt,
        montant: this.currentFacture.montantHt
      }];
    }
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
      this.currentFacture.fichierJustificatif = this.selectedFile?.name;
    }
  }

  addPrestation() {
    if (!this.currentFacture.prestations) this.currentFacture.prestations = [];
    this.currentFacture.prestations.push({
      type: 'HONORAIRES',
      description: '',
      quantite: 1,
      prixUnitaire: 0,
      montant: 0
    });
  }

  removePrestation(index: number) {
    this.currentFacture.prestations?.splice(index, 1);
    this.recalcTotal();
  }

  recalcPrestation(index: number) {
    const p = this.currentFacture.prestations?.[index];
    if (p) {
      p.montant = (p.quantite || 0) * (p.prixUnitaire || 0);
      this.recalcTotal();
    }
  }

  recalcTotal() {
    const totalHt = this.currentFacture.prestations?.reduce((acc, curr) => acc + (curr.montant || 0), 0) || 0;
    this.currentFacture.montantHt = totalHt;
    this.calculateTtc();
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
    if (!id || !Number.isFinite(Number(id))) {
      this.showBanner('danger', 'Impossible de supprimer: identifiant facture invalide');
      return;
    }
    if (confirm('Voulez-vous vraiment supprimer cette facture ?')) {
      this.facturesService.delete(id).subscribe({
        next: () => {
          this.showBanner('success', 'Facture supprimée');
          this.loadFactures();
        },
        error: (err) => {
          const status = err?.status;
          const apiMsg = err?.error?.message || err?.error?.error;
          if (status === 0) {
            this.showBanner('danger', 'Impossible de joindre le serveur');
          } else if (status === 401) {
            this.showBanner('danger', 'Session expirée (401). Veuillez vous reconnecter.');
          } else if (status === 403) {
            this.showBanner('danger', 'Accès refusé (403)');
          } else if (status === 404) {
            this.showBanner('danger', 'Facture introuvable (404)');
          } else if (status === 409) {
            this.showBanner('danger', apiMsg ? `Suppression impossible: ${apiMsg}` : 'Suppression impossible (409)');
          } else {
            this.showBanner('danger', apiMsg ? `Erreur (${status}): ${apiMsg}` : 'Erreur lors de la suppression');
          }
        }
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
