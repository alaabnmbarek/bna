package com.example.secureapp.prestataire.dto;

import com.example.secureapp.prestataire.MissionStatus;
import com.example.secureapp.prestataire.MissionType;
import com.example.secureapp.suivi_judiciaire.ProcedureType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class MissionDto {
    private Long id;
    private Long prestataireId;
    private MissionType typeMission;
    private String codeMission;
    private String titre;
    private String description;
    private String dossierReference;
    private Long procedureId;
    private ProcedureType procedureType;
    private String affaireNumero;
    private String procedureTribunal;
    private Integer dureeEstimee;
    private MissionStatus statut;
    private LocalDate dateDebut;
    private LocalDate dateEcheance;
    private LocalDate dateFin;
    private String assigneeParUsername;
    private Integer notePerformance;
    private String commentairePerformance;
    private BigDecimal cout;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPrestataireId() { return prestataireId; }
    public void setPrestataireId(Long prestataireId) { this.prestataireId = prestataireId; }
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
    public Long getProcedureId() { return procedureId; }
    public void setProcedureId(Long procedureId) { this.procedureId = procedureId; }
    public ProcedureType getProcedureType() { return procedureType; }
    public void setProcedureType(ProcedureType procedureType) { this.procedureType = procedureType; }
    public String getAffaireNumero() { return affaireNumero; }
    public void setAffaireNumero(String affaireNumero) { this.affaireNumero = affaireNumero; }
    public String getProcedureTribunal() { return procedureTribunal; }
    public void setProcedureTribunal(String procedureTribunal) { this.procedureTribunal = procedureTribunal; }
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
}
