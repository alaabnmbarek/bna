package com.example.secureapp.prestataire;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "prestataires")
public class PrestataireEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PrestataireType type;

    @Column(nullable = false, length = 150)
    private String nom;

    @Column(length = 150)
    private String prenom;

    @Column(length = 200)
    private String cabinet;

    @Column(length = 60)
    private String numeroCompte;

    @Column(length = 60)
    private String matriculeFiscale;

    @Column(length = 40)
    private String natureJuridique;

    @Column(length = 150)
    private String pttNomBanque;

    @Column(length = 150)
    private String email;

    @Column(length = 30)
    private String telephone;

    @Column(length = 255)
    private String adresse;

    @Column(columnDefinition = "LONGTEXT")
    private String specialites;

    @Column(columnDefinition = "LONGTEXT")
    private String tarifs;

    @Column(columnDefinition = "LONGTEXT")
    private String disponibilites;

    private Integer experienceAvocat;

    @Column(nullable = false)
    private boolean actif = true;

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
    public PrestataireType getType() { return type; }
    public void setType(PrestataireType type) { this.type = type; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    public String getCabinet() { return cabinet; }
    public void setCabinet(String cabinet) { this.cabinet = cabinet; }
    public String getNumeroCompte() { return numeroCompte; }
    public void setNumeroCompte(String numeroCompte) { this.numeroCompte = numeroCompte; }
    public String getMatriculeFiscale() { return matriculeFiscale; }
    public void setMatriculeFiscale(String matriculeFiscale) { this.matriculeFiscale = matriculeFiscale; }
    public String getNatureJuridique() { return natureJuridique; }
    public void setNatureJuridique(String natureJuridique) { this.natureJuridique = natureJuridique; }
    public String getPttNomBanque() { return pttNomBanque; }
    public void setPttNomBanque(String pttNomBanque) { this.pttNomBanque = pttNomBanque; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public String getAdresse() { return adresse; }
    public void setAdresse(String adresse) { this.adresse = adresse; }
    public String getSpecialites() { return specialites; }
    public void setSpecialites(String specialites) { this.specialites = specialites; }
    public String getTarifs() { return tarifs; }
    public void setTarifs(String tarifs) { this.tarifs = tarifs; }
    public String getDisponibilites() { return disponibilites; }
    public void setDisponibilites(String disponibilites) { this.disponibilites = disponibilites; }
    public Integer getExperienceAvocat() { return experienceAvocat; }
    public void setExperienceAvocat(Integer experienceAvocat) { this.experienceAvocat = experienceAvocat; }
    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
