package com.example.secureapp.suivi_judiciaire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.prestataire.PrestataireEntity;
import com.example.secureapp.prestataire.PrestataireRepository;
import com.example.secureapp.suivi_judiciaire.dto.*;
import com.example.secureapp.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SuiviJudiciaireService {

    private final AffaireJudiciaireRepository affaireRepository;
    private final AudienceRepository audienceRepository;
    private final JugementRepository jugementRepository;
    private final DossierContentieuxRepository dossierRepository;
    private final PrestataireRepository prestataireRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<AffaireJudiciaireDto> getAllAffaires(Authentication authentication) {
        List<AffaireJudiciaireEntity> affaires;
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            affaires = affaireRepository.findAll().stream()
                    .filter(a -> a.getDossierContentieux().getChargeDossierId() != null && a.getDossierContentieux().getChargeDossierId().equals(uid))
                    .collect(Collectors.toList());
        } else if (isAvocat(authentication)) {
            Long pid = resolvePrestataireId(authentication);
            affaires = affaireRepository.findAll().stream()
                    .filter(a -> a.getAvocat() != null && a.getAvocat().getId() != null && a.getAvocat().getId().equals(pid))
                    .collect(Collectors.toList());
        } else {
            affaires = affaireRepository.findAll();
        }
        return affaires.stream()
                .map(this::mapToAffaireDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AffaireJudiciaireDto> getAffairesByDossier(Long dossierId, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierRepository.findById(dossierId)
                .orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            if (dossier.getChargeDossierId() == null || !dossier.getChargeDossierId().equals(uid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        List<AffaireJudiciaireEntity> affaires = affaireRepository.findByDossierContentieuxId(dossierId);
        if (isAvocat(authentication)) {
            Long pid = resolvePrestataireId(authentication);
            affaires = affaires.stream()
                    .filter(a -> a.getAvocat() != null && a.getAvocat().getId() != null && a.getAvocat().getId().equals(pid))
                    .collect(Collectors.toList());
            if (affaires.isEmpty()) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        return affaires.stream().map(this::mapToAffaireDto).collect(Collectors.toList());
    }

    @Transactional
    public AffaireJudiciaireDto createAffaire(AffaireJudiciaireDto dto, Authentication authentication) {
        DossierContentieuxEntity dossier = dossierRepository.findById(dto.dossierId())
                .orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            if (dossier.getChargeDossierId() == null || !dossier.getChargeDossierId().equals(uid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        
        AffaireJudiciaireEntity entity = new AffaireJudiciaireEntity();
        entity.setDossierContentieux(dossier);
        entity.setReferenceTribunal(dto.referenceTribunal());
        ProcedureType procedureType = dto.typeProcedure() != null ? dto.typeProcedure() : ProcedureType.ASSIGNATION;
        entity.setTypeProcedure(procedureType);

        if (procedureType == ProcedureType.ASSIGNATION) {
            entity.setAssignationTarget(dto.assignationTarget());
            entity.setGarantiePatrimoine(dto.garantiePatrimoine());
            entity.setMontant(dto.montant());
        } else {
            entity.setAssignationTarget(null);
            entity.setGarantiePatrimoine(null);
            entity.setMontant(null);
        }
        entity.setDateTransmission(dto.dateTransmission());
        entity.setStatut(AffaireStatus.EN_COURS);
        entity.setTribunal(dto.tribunal());
        entity.setDateOuverture(dto.dateOuverture());
        entity.setObservations(dto.observations());

        if (dto.avocatId() == null) {
            throw new RuntimeException("Avocat obligatoire");
        }
        PrestataireEntity avocat = prestataireRepository.findById(dto.avocatId())
                .orElseThrow(() -> new RuntimeException("Avocat non trouvé"));
        entity.setAvocat(avocat);

        if (dto.dateTransmission() == null) {
            throw new RuntimeException("Date de transmission obligatoire");
        }
        if (procedureType == ProcedureType.ASSIGNATION) {
            if (dto.assignationTarget() == null) {
                throw new RuntimeException("Type d’assignation obligatoire");
            }
            if (dto.assignationTarget() == AssignationTarget.GARANTIE_PATRIMOINE) {
                if (dto.garantiePatrimoine() == null || dto.garantiePatrimoine().isBlank()) {
                    throw new RuntimeException("Garantie ou patrimoine obligatoire");
                }
                if (dto.montant() == null) {
                    throw new RuntimeException("Montant obligatoire");
                }
            }
        }

        if (dto.huissierId() != null) {
            PrestataireEntity huissier = prestataireRepository.findById(dto.huissierId())
                    .orElseThrow(() -> new RuntimeException("Huissier non trouvé"));
            entity.setHuissier(huissier);
        }

        return mapToAffaireDto(affaireRepository.save(entity));
    }

    @Transactional
    public AudienceDto scheduleAudience(AudienceDto dto, Authentication authentication) {
        AffaireJudiciaireEntity affaire = requireAccessibleAffaire(dto.affaireId(), authentication);

        AudienceEntity entity = new AudienceEntity();
        entity.setAffaireJudiciaire(affaire);
        entity.setDateAudience(dto.dateAudience());
        entity.setReferenceAudience(dto.referenceAudience());
        entity.setTribunal(dto.tribunal());
        entity.setSalle(dto.salle());
        entity.setObjet(dto.objet());
        entity.setStatut(AudienceStatus.PROGRAMMEE);

        return mapToAudienceDto(audienceRepository.save(entity));
    }

    @Transactional
    public AudienceDto updateAudience(Long id, AudienceDto dto, Authentication authentication) {
        AudienceEntity entity = audienceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Audience non trouvée"));
        
        requireAccessibleAffaire(entity.getAffaireJudiciaire().getId(), authentication);
        
        entity.setDateAudience(dto.dateAudience());
        entity.setReferenceAudience(dto.referenceAudience());
        entity.setTribunal(dto.tribunal());
        entity.setSalle(dto.salle());
        entity.setObjet(dto.objet());
        entity.setCompteRendu(dto.compteRendu());
        entity.setStatut(dto.statut());

        return mapToAudienceDto(audienceRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public List<AudienceDto> getAudiencesByAffaire(Long affaireId, Authentication authentication) {
        requireAccessibleAffaire(affaireId, authentication);
        return audienceRepository.findByAffaireJudiciaireIdOrderByDateAudienceAsc(affaireId).stream()
                .map(this::mapToAudienceDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AudienceDto> getAudiencier(LocalDateTime start, LocalDateTime end, Authentication authentication) {
        List<AudienceEntity> audiences;
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            audiences = audienceRepository.findByDateAudienceBetween(start, end).stream()
                    .filter(aud -> aud.getAffaireJudiciaire().getDossierContentieux().getChargeDossierId() != null && 
                                   aud.getAffaireJudiciaire().getDossierContentieux().getChargeDossierId().equals(uid))
                    .collect(Collectors.toList());
        } else {
            audiences = audienceRepository.findByDateAudienceBetween(start, end);
        }
        return audiences.stream()
                .map(this::mapToAudienceDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AffaireJudiciaireDto updateAffaire(Long id, AffaireJudiciaireDto dto, Authentication authentication) {
        AffaireJudiciaireEntity entity = requireAccessibleAffaire(id, authentication);
        
        entity.setReferenceTribunal(dto.referenceTribunal());
        entity.setTribunal(dto.tribunal());
        entity.setDateOuverture(dto.dateOuverture());
        entity.setObservations(dto.observations());
        entity.setDateTransmission(dto.dateTransmission());
        
        if (dto.avocatId() != null) {
            PrestataireEntity avocat = prestataireRepository.findById(dto.avocatId())
                    .orElseThrow(() -> new RuntimeException("Avocat non trouvé"));
            entity.setAvocat(avocat);
        }
        
        if (dto.huissierId() != null) {
            PrestataireEntity huissier = prestataireRepository.findById(dto.huissierId())
                    .orElseThrow(() -> new RuntimeException("Huissier non trouvé"));
            entity.setHuissier(huissier);
        } else {
            entity.setHuissier(null);
        }

        if (entity.getTypeProcedure() == ProcedureType.ASSIGNATION) {
            entity.setAssignationTarget(dto.assignationTarget());
            entity.setGarantiePatrimoine(dto.garantiePatrimoine());
            entity.setMontant(dto.montant());
        }

        return mapToAffaireDto(affaireRepository.save(entity));
    }

    @Transactional
    public void deleteAffaire(Long id, Authentication authentication) {
        requireAccessibleAffaire(id, authentication);
        affaireRepository.deleteById(id);
    }

    @Transactional
    public JugementDto recordJugement(JugementDto dto, Authentication authentication) {
        AffaireJudiciaireEntity affaire = requireAccessibleAffaire(dto.affaireId(), authentication);

        JugementEntity entity = jugementRepository.findByAffaireJudiciaireId(dto.affaireId())
                .orElse(new JugementEntity());
        
        entity.setAffaireJudiciaire(affaire);
        entity.setDateJugement(dto.dateJugement());
        entity.setTypeDecision(dto.typeDecision());
        entity.setMontantRecupere(dto.montantRecupere());
        entity.setObservations(dto.observations());
        entity.setDocumentUrl(dto.documentUrl());

        affaire.setStatut(AffaireStatus.JUGEE);
        affaireRepository.save(affaire);

        return mapToJugementDto(jugementRepository.save(entity));
    }

    private AffaireJudiciaireEntity requireAccessibleAffaire(Long affaireId, Authentication authentication) {
        AffaireJudiciaireEntity affaire = affaireRepository.findById(affaireId)
                .orElseThrow(() -> new RuntimeException("Affaire non trouvée"));
        
        if (isChargeDossier(authentication)) {
            Long uid = requireCurrentUserId(authentication);
            if (affaire.getDossierContentieux().getChargeDossierId() == null || !affaire.getDossierContentieux().getChargeDossierId().equals(uid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        if (isAvocat(authentication)) {
            Long pid = resolvePrestataireId(authentication);
            Long avocatId = affaire.getAvocat() != null ? affaire.getAvocat().getId() : null;
            if (avocatId == null || !avocatId.equals(pid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        return affaire;
    }

    private boolean isChargeDossier(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CHARGE_DOSSIER"));
    }

    private boolean isAvocat(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_AVOCAT".equals(v) || "AVOCAT".equals(v);
        });
    }

    private Long requireCurrentUserId(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        return userRepository.findByUsername(username).map(com.example.secureapp.user.UserEntity::getId).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    private Long resolvePrestataireId(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        String email = userRepository.findByUsername(username).map(u -> u.getEmail() != null && !u.getEmail().isBlank() ? u.getEmail() : username)
                .orElse(username);
        return prestataireRepository.findFirstByEmailIgnoreCase(email)
                .map(PrestataireEntity::getId)
                .orElseThrow(() -> new RuntimeException("Prestataire lié au compte introuvable (vérifiez l'email du profil et du prestataire)"));
    }

    private AffaireJudiciaireDto mapToAffaireDto(AffaireJudiciaireEntity entity) {
        return new AffaireJudiciaireDto(
                entity.getId(),
                entity.getDossierContentieux().getId(),
                entity.getDossierContentieux().getReference(),
                entity.getDossierContentieux().getNomDebiteur(),
                entity.getReferenceTribunal(),
                entity.getTypeProcedure(),
                entity.getAssignationTarget(),
                entity.getGarantiePatrimoine(),
                entity.getMontant(),
                entity.getDateTransmission(),
                entity.getStatut(),
                entity.getTribunal(),
                entity.getDateOuverture(),
                entity.getAvocat() != null ? entity.getAvocat().getId() : null,
                entity.getAvocat() != null ? entity.getAvocat().getNom() + " " + entity.getAvocat().getPrenom() : null,
                entity.getHuissier() != null ? entity.getHuissier().getId() : null,
                entity.getHuissier() != null ? entity.getHuissier().getNom() + " " + entity.getHuissier().getPrenom() : null,
                entity.getObservations()
        );
    }

    private AudienceDto mapToAudienceDto(AudienceEntity entity) {
        return new AudienceDto(
                entity.getId(),
                entity.getAffaireJudiciaire().getId(),
                entity.getAffaireJudiciaire().getReferenceTribunal(),
                entity.getDateAudience(),
                entity.getReferenceAudience(),
                entity.getTribunal(),
                entity.getSalle(),
                entity.getObjet(),
                entity.getCompteRendu(),
                entity.getStatut()
        );
    }

    private JugementDto mapToJugementDto(JugementEntity entity) {
        return new JugementDto(
                entity.getId(),
                entity.getAffaireJudiciaire().getId(),
                entity.getDateJugement(),
                entity.getTypeDecision(),
                entity.getMontantRecupere(),
                entity.getObservations(),
                entity.getDocumentUrl()
        );
    }
}
