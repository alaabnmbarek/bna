package com.example.secureapp.prestataire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.prestataire.dto.PrestataireDto;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireEntity;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireRepository;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;

import java.util.DoubleSummaryStatistics;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PrestataireService {
    private final PrestataireRepository prestataireRepository;
    private final MissionRepository missionRepository;
    private final UserRepository userRepository;
    private final NoteHonoraireRepository noteHonoraireRepository;
    private final DossierContentieuxRepository dossierContentieuxRepository;

    public PrestataireService(PrestataireRepository prestataireRepository, MissionRepository missionRepository, UserRepository userRepository, NoteHonoraireRepository noteHonoraireRepository, DossierContentieuxRepository dossierContentieuxRepository) {
        this.prestataireRepository = prestataireRepository;
        this.missionRepository = missionRepository;
        this.userRepository = userRepository;
        this.noteHonoraireRepository = noteHonoraireRepository;
        this.dossierContentieuxRepository = dossierContentieuxRepository;
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

    @Transactional(readOnly = true)
    public PrestataireDto getMe(Authentication authentication) {
        PrestataireEntity entity = resolvePrestataire(authentication);
        return toDtoWithStats(entity);
    }

    @Transactional(readOnly = true)
    public List<DossierContentieuxEntity> listMyDossiers(Authentication authentication) {
        PrestataireEntity p = resolvePrestataire(authentication);
        Long prestataireId = p.getId();

        Map<Long, DossierContentieuxEntity> out = new LinkedHashMap<>();
        List<NoteHonoraireEntity> notes = noteHonoraireRepository.findByPrestataireIdOrderByCreatedAtDesc(prestataireId);
        for (NoteHonoraireEntity n : notes) {
            if (n.getDossier() != null) {
                out.putIfAbsent(n.getDossier().getId(), n.getDossier());
            }
        }

        List<MissionEntity> missions = missionRepository.findByPrestataireIdOrderByCreatedAtDesc(prestataireId);
        for (MissionEntity m : missions) {
            String ref = m.getDossierReference();
            if (ref == null || ref.isBlank()) continue;
            dossierContentieuxRepository.findByReference(ref)
                    .or(() -> dossierContentieuxRepository.findTopByCompteActuelOrderByCreatedAtDesc(ref))
                    .or(() -> dossierContentieuxRepository.findTopByAncienCompteOrderByCreatedAtDesc(ref))
                    .ifPresent(d -> out.putIfAbsent(d.getId(), d));
        }

        return out.values().stream().toList();
    }

    private PrestataireEntity resolvePrestataire(Authentication authentication) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new RuntimeException("Utilisateur non authentifié");
        }
        String username = authentication.getName();
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        String email = user.getEmail();
        if (email == null || email.isBlank()) email = username;
        return prestataireRepository.findFirstByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Prestataire lié au compte introuvable (vérifiez l'email du profil et du prestataire)"));
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
        entity.setPrenom(dto.getPrenom());
        entity.setCabinet(dto.getCabinet());
        entity.setNumeroCompte(dto.getNumeroCompte());
        entity.setMatriculeFiscale(dto.getMatriculeFiscale());
        entity.setNatureJuridique(dto.getNatureJuridique());
        entity.setPttNomBanque(dto.getPttNomBanque());
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
        dto.setPrenom(entity.getPrenom());
        dto.setCabinet(entity.getCabinet());
        dto.setNumeroCompte(entity.getNumeroCompte());
        dto.setMatriculeFiscale(entity.getMatriculeFiscale());
        dto.setNatureJuridique(entity.getNatureJuridique());
        dto.setPttNomBanque(entity.getPttNomBanque());
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
