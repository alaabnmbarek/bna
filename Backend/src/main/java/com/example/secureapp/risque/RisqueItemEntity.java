package com.example.secureapp.risque;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "dossier_risque_items")
public class RisqueItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dossier_id", nullable = false)
    private DossierContentieuxEntity dossier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private RisqueCategory category;

    @Lob
    @Column(nullable = false)
    private String payloadJson;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DossierContentieuxEntity getDossier() {
        return dossier;
    }

    public void setDossier(DossierContentieuxEntity dossier) {
        this.dossier = dossier;
    }

    public RisqueCategory getCategory() {
        return category;
    }

    public void setCategory(RisqueCategory category) {
        this.category = category;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

