package com.example.secureapp.prestataire.honoraire;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "prestataire_note_prestations")
public class NotePrestationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String type;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 12, scale = 3, nullable = false)
    private BigDecimal montant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_honoraire_id", nullable = false)
    private NoteHonoraireEntity noteHonoraire;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public NoteHonoraireEntity getNoteHonoraire() { return noteHonoraire; }
    public void setNoteHonoraire(NoteHonoraireEntity noteHonoraire) { this.noteHonoraire = noteHonoraire; }
}
