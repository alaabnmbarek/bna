package com.example.secureapp.suivi_judiciaire;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "jugements")
public class JugementEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "affaire_id", nullable = false, unique = true)
    private AffaireJudiciaireEntity affaireJudiciaire;

    @Column(nullable = false)
    private LocalDate dateJugement;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DecisionType typeDecision;

    @Column(precision = 19, scale = 2)
    private BigDecimal montantRecupere;

    @Column(columnDefinition = "LONGTEXT")
    private String observations;

    @Column(length = 255)
    private String documentUrl;

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
    public AffaireJudiciaireEntity getAffaireJudiciaire() { return affaireJudiciaire; }
    public void setAffaireJudiciaire(AffaireJudiciaireEntity affaireJudiciaire) { this.affaireJudiciaire = affaireJudiciaire; }
    public LocalDate getDateJugement() { return dateJugement; }
    public void setDateJugement(LocalDate dateJugement) { this.dateJugement = dateJugement; }
    public DecisionType getTypeDecision() { return typeDecision; }
    public void setTypeDecision(DecisionType typeDecision) { this.typeDecision = typeDecision; }
    public BigDecimal getMontantRecupere() { return montantRecupere; }
    public void setMontantRecupere(BigDecimal montantRecupere) { this.montantRecupere = montantRecupere; }
    public String getObservations() { return observations; }
    public void setObservations(String observations) { this.observations = observations; }
    public String getDocumentUrl() { return documentUrl; }
    public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
