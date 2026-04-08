package com.example.secureapp.prestataire.honoraire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prestataire_id", nullable = false)
    private PrestataireEntity prestataire;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierContentieuxEntity dossier;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal montantHonoraires;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal fraisAdministratifs;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal tva;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal total;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PrestataireEntity getPrestataire() {
        return prestataire;
    }

    public void setPrestataire(PrestataireEntity prestataire) {
        this.prestataire = prestataire;
    }

    public DossierContentieuxEntity getDossier() {
        return dossier;
    }

    public void setDossier(DossierContentieuxEntity dossier) {
        this.dossier = dossier;
    }

    public BigDecimal getMontantHonoraires() {
        return montantHonoraires;
    }

    public void setMontantHonoraires(BigDecimal montantHonoraires) {
        this.montantHonoraires = montantHonoraires;
    }

    public BigDecimal getFraisAdministratifs() {
        return fraisAdministratifs;
    }

    public void setFraisAdministratifs(BigDecimal fraisAdministratifs) {
        this.fraisAdministratifs = fraisAdministratifs;
    }

    public BigDecimal getTva() {
        return tva;
    }

    public void setTva(BigDecimal tva) {
        this.tva = tva;
    }

    public BigDecimal getTotal() {
        return total;
    }

    public void setTotal(BigDecimal total) {
        this.total = total;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

