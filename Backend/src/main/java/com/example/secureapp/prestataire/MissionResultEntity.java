package com.example.secureapp.prestataire;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "prestataire_mission_results")
public class MissionResultEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mission_id", nullable = false, unique = true)
    private MissionEntity mission;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MissionResultStatus statut;

    private LocalDate dateDebut;
    private LocalDate dateFin;

    @Column(columnDefinition = "LONGTEXT")
    private String resultat;

    @Column(precision = 12, scale = 3)
    private BigDecimal montantRecuperee;

    @Lob
    private byte[] preuve;

    @Column(length = 200)
    private String preuveFileName;

    @Column(length = 120)
    private String preuveContentType;

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
    public MissionEntity getMission() { return mission; }
    public void setMission(MissionEntity mission) { this.mission = mission; }
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
    public byte[] getPreuve() { return preuve; }
    public void setPreuve(byte[] preuve) { this.preuve = preuve; }
    public String getPreuveFileName() { return preuveFileName; }
    public void setPreuveFileName(String preuveFileName) { this.preuveFileName = preuveFileName; }
    public String getPreuveContentType() { return preuveContentType; }
    public void setPreuveContentType(String preuveContentType) { this.preuveContentType = preuveContentType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}

