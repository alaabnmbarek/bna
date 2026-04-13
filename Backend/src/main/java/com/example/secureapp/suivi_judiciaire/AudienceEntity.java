package com.example.secureapp.suivi_judiciaire;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audiences")
public class AudienceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "affaire_id", nullable = false)
    private AffaireJudiciaireEntity affaireJudiciaire;

    @Column(nullable = false)
    private LocalDateTime dateAudience;

    @Column(length = 100)
    private String referenceAudience;

    @Column(length = 150)
    private String tribunal;

    @Column(length = 80)
    private String salle;

    @Column(nullable = false, length = 255)
    private String objet;

    @Column(columnDefinition = "LONGTEXT")
    private String compteRendu;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AudienceStatus statut = AudienceStatus.PROGRAMMEE;

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
    public LocalDateTime getDateAudience() { return dateAudience; }
    public void setDateAudience(LocalDateTime dateAudience) { this.dateAudience = dateAudience; }
    public String getReferenceAudience() { return referenceAudience; }
    public void setReferenceAudience(String referenceAudience) { this.referenceAudience = referenceAudience; }
    public String getTribunal() { return tribunal; }
    public void setTribunal(String tribunal) { this.tribunal = tribunal; }
    public String getSalle() { return salle; }
    public void setSalle(String salle) { this.salle = salle; }
    public String getObjet() { return objet; }
    public void setObjet(String objet) { this.objet = objet; }
    public String getCompteRendu() { return compteRendu; }
    public void setCompteRendu(String compteRendu) { this.compteRendu = compteRendu; }
    public AudienceStatus getStatut() { return statut; }
    public void setStatut(AudienceStatus statut) { this.statut = statut; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
