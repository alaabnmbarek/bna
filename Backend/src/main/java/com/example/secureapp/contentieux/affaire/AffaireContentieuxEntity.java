package com.example.secureapp.contentieux.affaire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "affaires_contentieux")
public class AffaireContentieuxEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierContentieuxEntity dossier;

    @Column(length = 120, unique = true)
    private String numeroAffaire;

    @Column(nullable = false, length = 120)
    private String typeAffaire;

    @Column(columnDefinition = "LONGTEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AffaireStatut statut;

    @Column(nullable = false)
    private LocalDate dateCreation;

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
    public DossierContentieuxEntity getDossier() { return dossier; }
    public void setDossier(DossierContentieuxEntity dossier) { this.dossier = dossier; }
    public String getNumeroAffaire() { return numeroAffaire; }
    public void setNumeroAffaire(String numeroAffaire) { this.numeroAffaire = numeroAffaire; }
    public String getTypeAffaire() { return typeAffaire; }
    public void setTypeAffaire(String typeAffaire) { this.typeAffaire = typeAffaire; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public AffaireStatut getStatut() { return statut; }
    public void setStatut(AffaireStatut statut) { this.statut = statut; }
    public LocalDate getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDate dateCreation) { this.dateCreation = dateCreation; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
