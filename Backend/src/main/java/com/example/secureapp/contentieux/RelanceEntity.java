package com.example.secureapp.contentieux;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "relances")
@Data
public class RelanceEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierContentieuxEntity dossier;

    @Column(nullable = false)
    private LocalDate dateRelance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RelanceType typeRelance;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RelanceStatut statut;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

