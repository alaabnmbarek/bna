package com.example.secureapp.contentieux;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "dossiers_contentieux")
public class DossierContentieuxEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 30)
    private String reference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ContentieuxStatus statut;

    @Column(length = 255)
    private String objet;

    @Column(nullable = false, length = 150)
    private String nomDebiteur;

    @Column(length = 60)
    private String compteActuel;

    @Column(length = 60)
    private String ancienCompte;

    @Column(length = 150)
    private String agence;

    @Column(length = 150)
    private String chargeDossier;

    @Column(name = "charge_dossier_id")
    private Long chargeDossierId;

    private LocalDate dateOuverture;

    @Column(precision = 19, scale = 2)
    private BigDecimal montantEngage;

    @Column(precision = 19, scale = 2)
    private BigDecimal montantRecupere;

    @Column(precision = 12, scale = 3)
    private BigDecimal montantHonoraires;

    @Column(precision = 12, scale = 3)
    private BigDecimal fraisAdministratifs;

    @Column(columnDefinition = "LONGTEXT")
    private String observationsAdministratives;

    @Column(columnDefinition = "LONGTEXT")
    private String observationsFinancieres;

    private LocalDate dateCloture;

    @Column(length = 255)
    private String motifCloture;

    @Column(length = 150)
    private String createdBy;

    @Column(length = 150)
    private String validatedBy;

    private LocalDateTime validatedAt;

    @Column(name = "validated_by_ctx", nullable = false)
    private boolean validatedByCtx = false;

    @Column(nullable = false)
    private boolean deleted = false;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public ContentieuxStatus getStatut() {
        return statut;
    }

    public void setStatut(ContentieuxStatus statut) {
        this.statut = statut;
    }

    public String getObjet() {
        return objet;
    }

    public void setObjet(String objet) {
        this.objet = objet;
    }

    public String getNomDebiteur() {
        return nomDebiteur;
    }

    public void setNomDebiteur(String nomDebiteur) {
        this.nomDebiteur = nomDebiteur;
    }

    public String getCompteActuel() {
        return compteActuel;
    }

    public void setCompteActuel(String compteActuel) {
        this.compteActuel = compteActuel;
    }

    public String getAncienCompte() {
        return ancienCompte;
    }

    public void setAncienCompte(String ancienCompte) {
        this.ancienCompte = ancienCompte;
    }

    public String getAgence() {
        return agence;
    }

    public void setAgence(String agence) {
        this.agence = agence;
    }

    public String getChargeDossier() {
        return chargeDossier;
    }

    public void setChargeDossier(String chargeDossier) {
        this.chargeDossier = chargeDossier;
    }

    public Long getChargeDossierId() {
        return chargeDossierId;
    }

    public void setChargeDossierId(Long chargeDossierId) {
        this.chargeDossierId = chargeDossierId;
    }

    public LocalDate getDateOuverture() {
        return dateOuverture;
    }

    public void setDateOuverture(LocalDate dateOuverture) {
        this.dateOuverture = dateOuverture;
    }

    public BigDecimal getMontantEngage() {
        return montantEngage;
    }

    public void setMontantEngage(BigDecimal montantEngage) {
        this.montantEngage = montantEngage;
    }

    public BigDecimal getMontantRecupere() {
        return montantRecupere;
    }

    public void setMontantRecupere(BigDecimal montantRecupere) {
        this.montantRecupere = montantRecupere;
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

    public String getObservationsAdministratives() {
        return observationsAdministratives;
    }

    public void setObservationsAdministratives(String observationsAdministratives) {
        this.observationsAdministratives = observationsAdministratives;
    }

    public String getObservationsFinancieres() {
        return observationsFinancieres;
    }

    public void setObservationsFinancieres(String observationsFinancieres) {
        this.observationsFinancieres = observationsFinancieres;
    }

    public LocalDate getDateCloture() {
        return dateCloture;
    }

    public void setDateCloture(LocalDate dateCloture) {
        this.dateCloture = dateCloture;
    }

    public String getMotifCloture() {
        return motifCloture;
    }

    public void setMotifCloture(String motifCloture) {
        this.motifCloture = motifCloture;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getValidatedBy() {
        return validatedBy;
    }

    public void setValidatedBy(String validatedBy) {
        this.validatedBy = validatedBy;
    }

    public LocalDateTime getValidatedAt() {
        return validatedAt;
    }

    public void setValidatedAt(LocalDateTime validatedAt) {
        this.validatedAt = validatedAt;
    }

    public boolean isValidatedByCtx() {
        return validatedByCtx;
    }

    public void setValidatedByCtx(boolean validatedByCtx) {
        this.validatedByCtx = validatedByCtx;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
