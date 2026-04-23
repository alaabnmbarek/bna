package com.example.secureapp.facture;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;

@Entity
@Table(name = "facture_prestations")
@Data
public class FacturePrestationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer quantite = 1;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal prixUnitaire;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal montant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facture_id", nullable = false)
    private FactureEntity facture;
}
