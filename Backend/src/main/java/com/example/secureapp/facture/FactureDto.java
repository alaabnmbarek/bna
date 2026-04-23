package com.example.secureapp.facture;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class FactureDto {
    private Long id;
    private String numero;
    private Double montantHt;
    private Double tva;
    private Double montantTtc;
    private Double montantPaye;
    private Double resteAPayer;
    private FactureStatus statut;
    private LocalDate dateFacture;
    private TypeLien typeLien;
    private String referenceLien;
    private Long prestataireId;
    private String fichierJustificatif;
    private String remarques;
    private String conditionsPaiement;
    private String modePaiement;
    private Long noteHonoraireId;
    private java.util.List<PrestationDto> prestations;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    public static class PrestationDto {
        private String type;
        private String description;
        private Integer quantite;
        private java.math.BigDecimal prixUnitaire;
        private java.math.BigDecimal montant;
    }
}
