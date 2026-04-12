package com.example.secureapp.suivi_judiciaire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.prestataire.PrestataireEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "affaires_judiciaires")
public class AffaireJudiciaireEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierContentieuxEntity dossierContentieux;

    @Column(nullable = false, length = 50)
    private String referenceTribunal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProcedureType typeProcedure;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private AssignationTarget assignationTarget;

    @Column(length = 255)
    private String garantiePatrimoine;

    @Column(precision = 19, scale = 2)
    private BigDecimal montant;

    private LocalDate dateTransmission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AffaireStatus statut = AffaireStatus.EN_COURS;

    @Column(nullable = false, length = 150)
    private String tribunal;

    @Column(nullable = false)
    private LocalDate dateOuverture;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "avocat_id")
    private PrestataireEntity avocat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "huissier_id")
    private PrestataireEntity huissier;

    @Column(columnDefinition = "LONGTEXT")
    private String observations;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public DossierContentieuxEntity getDossierContentieux() { return dossierContentieux; }
    public void setDossierContentieux(DossierContentieuxEntity dossierContentieux) { this.dossierContentieux = dossierContentieux; }
    public String getReferenceTribunal() { return referenceTribunal; }
    public void setReferenceTribunal(String referenceTribunal) { this.referenceTribunal = referenceTribunal; }
    public ProcedureType getTypeProcedure() { return typeProcedure; }
    public void setTypeProcedure(ProcedureType typeProcedure) { this.typeProcedure = typeProcedure; }
    public AssignationTarget getAssignationTarget() { return assignationTarget; }
    public void setAssignationTarget(AssignationTarget assignationTarget) { this.assignationTarget = assignationTarget; }
    public String getGarantiePatrimoine() { return garantiePatrimoine; }
    public void setGarantiePatrimoine(String garantiePatrimoine) { this.garantiePatrimoine = garantiePatrimoine; }
    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }
    public LocalDate getDateTransmission() { return dateTransmission; }
    public void setDateTransmission(LocalDate dateTransmission) { this.dateTransmission = dateTransmission; }
    public AffaireStatus getStatut() { return statut; }
    public void setStatut(AffaireStatus statut) { this.statut = statut; }
    public String getTribunal() { return tribunal; }
    public void setTribunal(String tribunal) { this.tribunal = tribunal; }
    public LocalDate getDateOuverture() { return dateOuverture; }
    public void setDateOuverture(LocalDate dateOuverture) { this.dateOuverture = dateOuverture; }
    public PrestataireEntity getAvocat() { return avocat; }
    public void setAvocat(PrestataireEntity avocat) { this.avocat = avocat; }
    public PrestataireEntity getHuissier() { return huissier; }
    public void setHuissier(PrestataireEntity huissier) { this.huissier = huissier; }
    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
