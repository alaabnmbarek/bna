package com.example.secureapp.prestataire.dto;

import com.example.secureapp.prestataire.MissionResultStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class MissionResultDto {
    private Long id;
    private Long missionId;
    private MissionResultStatus statut;
    private LocalDate dateDebut;
    private LocalDate dateFin;
    private String resultat;
    private BigDecimal montantRecuperee;
    private boolean hasPreuve;
    private String preuveFileName;
    private String preuveContentType;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getMissionId() { return missionId; }
    public void setMissionId(Long missionId) { this.missionId = missionId; }
    public MissionResultStatus getStatut() { return statut; }
    public void setStatut(MissionResultStatus statut) { this.statut = statut; }
    public LocalDate getDateDebut() { return dateDebut; }
    public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }
    public LocalDate getDateFin() { return dateFin; }
    public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }
    public String getResultat() { return resultat; }
    public void setResultat(String resultat) { this.resultat = resultat; }
    public BigDecimal getMontantRecuperee() { return montantRecuperee; }
    public void setMontantRecuperee(BigDecimal montantRecuperee) { this.montantRecuperee = montantRecuperee; }
    public boolean isHasPreuve() { return hasPreuve; }
    public void setHasPreuve(boolean hasPreuve) { this.hasPreuve = hasPreuve; }
    public String getPreuveFileName() { return preuveFileName; }
    public void setPreuveFileName(String preuveFileName) { this.preuveFileName = preuveFileName; }
    public String getPreuveContentType() { return preuveContentType; }
    public void setPreuveContentType(String preuveContentType) { this.preuveContentType = preuveContentType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}

