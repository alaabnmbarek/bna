package com.example.secureapp.prestataire.honoraire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.facture.TypeLien;
import com.example.secureapp.prestataire.PrestataireEntity;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "prestataire_notes_honoraires")
public class NoteHonoraireEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String numero;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prestataire_id", nullable = false)
    private PrestataireEntity prestataire;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierContentieuxEntity dossier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TypeLien typeLien;

    @Column(nullable = false)
    private String referenceLien;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal montantHonoraires;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal fraisAdministratifs;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal tva;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal total;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NoteHonoraireStatus statut = NoteHonoraireStatus.EN_COURS;

    @Column(columnDefinition = "LONGTEXT")
    private String fichierJustificatif;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.numero == null) {
            this.numero = "NH-" + System.currentTimeMillis();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public PrestataireEntity getPrestataire() { return prestataire; }
    public void setPrestataire(PrestataireEntity prestataire) { this.prestataire = prestataire; }

    public DossierContentieuxEntity getDossier() { return dossier; }
    public void setDossier(DossierContentieuxEntity dossier) { this.dossier = dossier; }

    public TypeLien getTypeLien() { return typeLien; }
    public void setTypeLien(TypeLien typeLien) { this.typeLien = typeLien; }

    public String getReferenceLien() { return referenceLien; }
    public void setReferenceLien(String referenceLien) { this.referenceLien = referenceLien; }

    public BigDecimal getMontantHonoraires() { return montantHonoraires; }
    public void setMontantHonoraires(BigDecimal montantHonoraires) { this.montantHonoraires = montantHonoraires; }

    public BigDecimal getFraisAdministratifs() { return fraisAdministratifs; }
    public void setFraisAdministratifs(BigDecimal fraisAdministratifs) { this.fraisAdministratifs = fraisAdministratifs; }

    public BigDecimal getTva() { return tva; }
    public void setTva(BigDecimal tva) { this.tva = tva; }

    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }

    public NoteHonoraireStatus getStatut() { return statut; }
    public void setStatut(NoteHonoraireStatus statut) { this.statut = statut; }

    public String getFichierJustificatif() { return fichierJustificatif; }
    public void setFichierJustificatif(String fichierJustificatif) { this.fichierJustificatif = fichierJustificatif; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
