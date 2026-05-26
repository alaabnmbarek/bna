package com.example.secureapp.prestataire.dto;

import com.example.secureapp.prestataire.PrestataireType;

import java.time.LocalDateTime;

public class PrestataireDto {
    private Long id;
    private PrestataireType type;
    private String nom;
    private String prenom;
    private String cabinet;
    private String numeroCompte;
    private String matriculeFiscale;
    private String natureJuridique;
    private String pttNomBanque;
    private String email;
    private String telephone;
    private String adresse;
    private String specialites;
    private String tarifs;
    private String disponibilites;
    private Integer experienceAvocat;
    private boolean actif;
    private Double noteMoyenne;
    private Long missionsTotal;
    private Long missionsTerminees;
    private LocalDateTime createdAt;

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
    public Double getNoteMoyenne() { return noteMoyenne; }
    public void setNoteMoyenne(Double noteMoyenne) { this.noteMoyenne = noteMoyenne; }
    public Long getMissionsTotal() { return missionsTotal; }
    public void setMissionsTotal(Long missionsTotal) { this.missionsTotal = missionsTotal; }
    public Long getMissionsTerminees() { return missionsTerminees; }
    public void setMissionsTerminees(Long missionsTerminees) { this.missionsTerminees = missionsTerminees; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
