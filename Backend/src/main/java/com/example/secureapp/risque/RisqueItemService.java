package com.example.secureapp.risque;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.risque.dto.RisqueDtos;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class RisqueItemService {
    private final RisqueItemRepository repository;
    private final DossierContentieuxRepository dossierRepository;
    private final ObjectMapper objectMapper;

    public RisqueItemService(
            RisqueItemRepository repository,
            DossierContentieuxRepository dossierRepository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.dossierRepository = dossierRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<RisqueDtos.ItemResponse> listByDossierAndCategory(Long dossierId, RisqueCategory category) {
        requireDossier(dossierId);
        return repository.findByDossierIdAndCategoryOrderByUpdatedAtDesc(dossierId, category).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RisqueDtos.ItemResponse create(Long dossierId, RisqueCategory category, RisqueDtos.UpsertRequest request) {
        DossierContentieuxEntity dossier = requireDossier(dossierId);
        RisqueItemEntity entity = new RisqueItemEntity();
        entity.setDossier(dossier);
        entity.setCategory(category);
        entity.setPayloadJson(writeJson(request.payload()));
        return toResponse(repository.save(entity));
    }

    @Transactional
    public RisqueDtos.ItemResponse update(Long dossierId, RisqueCategory category, Long itemId, RisqueDtos.UpsertRequest request) {
        requireDossier(dossierId);
        RisqueItemEntity entity = repository.findById(itemId).orElseThrow(() -> new RuntimeException("Élément risque non trouvé"));
        if (!entity.getDossier().getId().equals(dossierId) || entity.getCategory() != category) {
            throw new RuntimeException("Élément risque non trouvé");
        }
        entity.setPayloadJson(writeJson(request.payload()));
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long dossierId, RisqueCategory category, Long itemId) {
        requireDossier(dossierId);
        RisqueItemEntity entity = repository.findById(itemId).orElseThrow(() -> new RuntimeException("Élément risque non trouvé"));
        if (!entity.getDossier().getId().equals(dossierId) || entity.getCategory() != category) {
            throw new RuntimeException("Élément risque non trouvé");
        }
        repository.delete(entity);
    }

    private DossierContentieuxEntity requireDossier(Long dossierId) {
        DossierContentieuxEntity dossier = dossierRepository.findById(dossierId).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        if (dossier.isDeleted()) {
            throw new RuntimeException("Dossier non trouvé");
        }
        return dossier;
    }

    private RisqueDtos.ItemResponse toResponse(RisqueItemEntity e) {
        return new RisqueDtos.ItemResponse(
                e.getId(),
                e.getDossier().getId(),
                e.getCategory(),
                readJson(e.getPayloadJson()),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private String writeJson(Map<String, Object> payload) {
        try {
            if (payload == null) return "{}";
            return objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            throw new RuntimeException("Payload invalide");
        }
    }

    private Map<String, Object> readJson(String json) {
        try {
            if (json == null || json.isBlank()) return Map.of();
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception ex) {
            return Map.of();
        }
    }
}

