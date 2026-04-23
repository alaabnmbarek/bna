package com.example.secureapp.prestataire;

import jakarta.persistence.*;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "prestataire_missions")
public class MissionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "prestataire_id", nullable = false)
    private PrestataireEntity prestataire;

    @Enumerated(EnumType.STRING)
    @Column(length = 60, columnDefinition = "VARCHAR(60)")
    private MissionType typeMission;

    @Column(length = 80)
    private String codeMission;

    @Column(nullable = false, length = 200)
    private String titre;

    @Column(columnDefinition = "LONGTEXT")
    private String description;

    @Column(length = 100)
    private String dossierReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "procedure_id")
    private AffaireJudiciaireEntity procedure;

    private Integer dureeEstimee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50, columnDefinition = "VARCHAR(50)")
    private MissionStatus statut = MissionStatus.ASSIGNEE;

    private LocalDate dateDebut;
    private LocalDate dateEcheance;
    private LocalDate dateFin;

    @Column(length = 100)
    private String assigneeParUsername;

    private Integer notePerformance;

    @Column(columnDefinition = "LONGTEXT")
    private String commentairePerformance;

    @Column(precision = 12, scale = 3)
    private BigDecimal cout;

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

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public PrestataireEntity getPrestataire() { return prestataire; }
    public void setPrestataire(PrestataireEntity prestataire) { this.prestataire = prestataire; }
    public MissionType getTypeMission() { return typeMission; }
    public void setTypeMission(MissionType typeMission) { this.typeMission = typeMission; }
    public String getCodeMission() { return codeMission; }
    public void setCodeMission(String codeMission) { this.codeMission = codeMission; }
    public String getTitre() { return titre; }
    public void setTitre(String titre) { this.titre = titre; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getDossierReference() { return dossierReference; }
    public void setDossierReference(String dossierReference) { this.dossierReference = dossierReference; }
    public AffaireJudiciaireEntity getProcedure() { return procedure; }
    public void setProcedure(AffaireJudiciaireEntity procedure) { this.procedure = procedure; }
    public Integer getDureeEstimee() { return dureeEstimee; }
    public void setDureeEstimee(Integer dureeEstimee) { this.dureeEstimee = dureeEstimee; }
    public MissionStatus getStatut() { return statut; }
    public void setStatut(MissionStatus statut) { this.statut = statut; }
    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }
    public LocalDate getDateEcheance() { return dateEcheance; }
    public void setDateEcheance(LocalDate dateEcheance) { this.dateEcheance = dateEcheance; }
    public LocalDate getDateFin() { return dateFin; }
    public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }
    public String getAssigneeParUsername() { return assigneeParUsername; }
    public void setAssigneeParUsername(String assigneeParUsername) { this.assigneeParUsername = assigneeParUsername; }
    public Integer getNotePerformance() { return notePerformance; }
    public void setNotePerformance(Integer notePerformance) { this.notePerformance = notePerformance; }
    public String getCommentairePerformance() { return commentairePerformance; }
    public void setCommentairePerformance(String commentairePerformance) { this.commentairePerformance = commentairePerformance; }
    public BigDecimal getCout() { return cout; }
    public void setCout(BigDecimal cout) { this.cout = cout; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
