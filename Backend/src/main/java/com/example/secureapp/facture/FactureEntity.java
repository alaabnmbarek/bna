package com.example.secureapp.facture;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "factures")
@Data
public class FactureEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String numero;

    @Column(nullable = false)
    private Double montantHt;

    @Column(nullable = false)
    private Double tva; // Percentage (e.g. 19.0)

    @Column(nullable = false)
    private Double montantTtc;

    private Double montantPaye = 0.0;
    
    private Double resteAPayer = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FactureStatus statut = FactureStatus.EN_COURS;

    @Column(nullable = false)
    private LocalDate dateFacture;

    @Enumerated(EnumType.STRING)
    private TypeLien typeLien;

    private String referenceLien; // e.g., ID of the Dossier, Affaire, or Mission

    private Long prestataireId;

    private String fichierJustificatif;

    @Column(columnDefinition = "TEXT")
    private String remarques;

    @Column(columnDefinition = "TEXT")
    private String conditionsPaiement;

    private String modePaiement;

    private Long noteHonoraireId;

    @OneToMany(mappedBy = "facture", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<FacturePrestationEntity> prestations = new java.util.ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        calculateReste();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        calculateReste();
    }

    public void calculateReste() {
        if (montantTtc != null) {
            if (montantPaye == null) montantPaye = 0.0;
            resteAPayer = montantTtc - montantPaye;
            if (resteAPayer <= 0 && statut != FactureStatus.VALIDEE && statut != FactureStatus.REFUSEE) {
                statut = FactureStatus.PAYEE;
            }
        }
    }
}
