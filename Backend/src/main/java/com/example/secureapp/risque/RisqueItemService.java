package com.example.secureapp.risque;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.risque.dto.RisqueDtos;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class RisqueItemService {
    private final RisqueItemRepository repository;
    private final DossierContentieuxRepository dossierRepository;
    private final ObjectMapper objectMapper;
    private final UserRepository userRepository;

    public RisqueItemService(
            RisqueItemRepository repository,
            DossierContentieuxRepository dossierRepository,
            ObjectMapper objectMapper,
            UserRepository userRepository
    ) {
        this.repository = repository;
        this.dossierRepository = dossierRepository;
        this.objectMapper = objectMapper;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<RisqueDtos.ItemResponse> listByDossierAndCategory(Long dossierId, RisqueCategory category, Authentication authentication) {
        requireDossier(dossierId, authentication);
        return repository.findByDossierIdAndCategoryOrderByUpdatedAtDesc(dossierId, category).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RisqueDtos.ItemResponse create(Long dossierId, RisqueCategory category, RisqueDtos.UpsertRequest request, Authentication authentication) {
        DossierContentieuxEntity dossier = requireDossier(dossierId, authentication);
        RisqueItemEntity entity = new RisqueItemEntity();
        entity.setDossier(dossier);
        entity.setCategory(category);
        entity.setPayloadJson(writeJson(request.payload()));
        return toResponse(repository.save(entity));
    }

    @Transactional
    public RisqueDtos.ItemResponse update(Long dossierId, RisqueCategory category, Long itemId, RisqueDtos.UpsertRequest request, Authentication authentication) {
        requireDossier(dossierId, authentication);
        RisqueItemEntity entity = repository.findById(itemId).orElseThrow(() -> new RuntimeException("Élément risque non trouvé"));
        if (!entity.getDossier().getId().equals(dossierId) || entity.getCategory() != category) {
            throw new RuntimeException("Élément risque non trouvé");
        }
        entity.setPayloadJson(writeJson(request.payload()));
        return toResponse(repository.save(entity));
    }

    @Transactional
    public void delete(Long dossierId, RisqueCategory category, Long itemId, Authentication authentication) {
        requireDossier(dossierId, authentication);
        RisqueItemEntity entity = repository.findById(itemId).orElseThrow(() -> new RuntimeException("Élément risque non trouvé"));
        if (!entity.getDossier().getId().equals(dossierId) || entity.getCategory() != category) {
            throw new RuntimeException("Élément risque non trouvé");
        }
        repository.delete(entity);
    }

    private DossierContentieuxEntity requireDossier(Long dossierId, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierRepository.findById(dossierId).orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        if (dossier.isDeleted()) {
            throw new RuntimeException("Dossier non trouvé");
        }
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            if (dossier.getChargeDossierId() == null || !dossier.getChargeDossierId().equals(uid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        return dossier;
    }

    private boolean isChargeDossier(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> "ROLE_CHARGE_DOSSIER".equals(a.getAuthority()));
    }

    private Long requireCurrentUserId(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        return userRepository.findByUsername(username).map(UserEntity::getId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
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
