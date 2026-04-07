package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.PrestataireDto;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.DoubleSummaryStatistics;
import java.util.List;

@Service
public class PrestataireService {
    private final PrestataireRepository prestataireRepository;
    private final MissionRepository missionRepository;

    public PrestataireService(PrestataireRepository prestataireRepository, MissionRepository missionRepository) {
        this.prestataireRepository = prestataireRepository;
        this.missionRepository = missionRepository;
    }

    @Transactional(readOnly = true)
    public List<PrestataireDto> list(PrestataireType type, String q, Boolean actif) {
        Specification<PrestataireEntity> spec = Specification.where(null);
        if (type != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("type"), type));
        }
        if (actif != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("actif"), actif));
        }
        if (q != null && !q.trim().isEmpty()) {
            String like = "%" + q.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("nom")), like),
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(root.get("telephone")), like)
            ));
        }

        return prestataireRepository.findAll(spec).stream().map(this::toDtoWithStats).toList();
    }

    @Transactional(readOnly = true)
    public PrestataireDto get(Long id) {
        PrestataireEntity entity = prestataireRepository.findById(id).orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
        return toDtoWithStats(entity);
    }

    @Transactional
    public PrestataireDto create(PrestataireDto dto) {
        PrestataireEntity entity = new PrestataireEntity();
        apply(dto, entity);
        PrestataireEntity saved = prestataireRepository.save(entity);
        return toDtoWithStats(saved);
    }

    @Transactional
    public PrestataireDto update(Long id, PrestataireDto dto) {
        PrestataireEntity entity = prestataireRepository.findById(id).orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
        apply(dto, entity);
        PrestataireEntity saved = prestataireRepository.save(entity);
        return toDtoWithStats(saved);
    }

    @Transactional
    public void deactivate(Long id) {
        PrestataireEntity entity = prestataireRepository.findById(id).orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
        entity.setActif(false);
        prestataireRepository.save(entity);
    }

    private void apply(PrestataireDto dto, PrestataireEntity entity) {
        if (dto.getType() != null) entity.setType(dto.getType());
        if (dto.getNom() != null) entity.setNom(dto.getNom());
        entity.setEmail(dto.getEmail());
        entity.setTelephone(dto.getTelephone());
        entity.setAdresse(dto.getAdresse());
        entity.setSpecialites(dto.getSpecialites());
        entity.setTarifs(dto.getTarifs());
        entity.setDisponibilites(dto.getDisponibilites());
        entity.setActif(dto.isActif());
    }

    private PrestataireDto toDtoWithStats(PrestataireEntity entity) {
        PrestataireDto dto = new PrestataireDto();
        dto.setId(entity.getId());
        dto.setType(entity.getType());
        dto.setNom(entity.getNom());
        dto.setEmail(entity.getEmail());
        dto.setTelephone(entity.getTelephone());
        dto.setAdresse(entity.getAdresse());
        dto.setSpecialites(entity.getSpecialites());
        dto.setTarifs(entity.getTarifs());
        dto.setDisponibilites(entity.getDisponibilites());
        dto.setActif(entity.isActif());
        dto.setCreatedAt(entity.getCreatedAt());

        List<MissionEntity> missions = missionRepository.findByPrestataireIdOrderByCreatedAtDesc(entity.getId());
        long total = missions.size();
        long terminees = missions.stream().filter(m -> m.getStatut() == MissionStatus.TERMINEE).count();
        DoubleSummaryStatistics notes = missions.stream()
                .map(MissionEntity::getNotePerformance)
                .filter(v -> v != null)
                .mapToDouble(Integer::doubleValue)
                .summaryStatistics();
        Double moyenne = notes.getCount() > 0 ? notes.getAverage() : null;

        dto.setMissionsTotal(total);
        dto.setMissionsTerminees(terminees);
        dto.setNoteMoyenne(moyenne);
        return dto;
    }
}
