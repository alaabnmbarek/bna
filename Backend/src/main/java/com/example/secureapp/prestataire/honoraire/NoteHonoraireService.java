package com.example.secureapp.prestataire.honoraire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.facture.FactureDto;
import com.example.secureapp.facture.FactureService;
import com.example.secureapp.facture.FactureStatus;
import com.example.secureapp.prestataire.PrestataireEntity;
import com.example.secureapp.prestataire.PrestataireRepository;
import com.example.secureapp.prestataire.honoraire.dto.NoteHonoraireDtos;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class NoteHonoraireService {
    private final NoteHonoraireRepository repository;
    private final PrestataireRepository prestataireRepository;
    private final DossierContentieuxRepository dossierRepository;
    private final UserRepository userRepository;
    private final FactureService factureService;

    public NoteHonoraireService(
            NoteHonoraireRepository repository,
            PrestataireRepository prestataireRepository,
            DossierContentieuxRepository dossierRepository,
            UserRepository userRepository,
            FactureService factureService
    ) {
        this.repository = repository;
        this.prestataireRepository = prestataireRepository;
        this.dossierRepository = dossierRepository;
        this.userRepository = userRepository;
        this.factureService = factureService;
    }

    @Transactional(readOnly = true)
    public List<NoteHonoraireDtos.NoteResponse> getAll() {
        return repository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<NoteHonoraireDtos.NoteResponse> listByPrestataire(Long prestataireId) {
        return repository.findByPrestataireIdOrderByCreatedAtDesc(prestataireId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NoteHonoraireDtos.NoteResponse> listMine(Authentication authentication) {
        PrestataireEntity prestataire = resolvePrestataire(authentication, null);
        return listByPrestataire(prestataire.getId());
    }

    public boolean isInternal(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_ADMIN".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v)
                    || "ADMIN".equals(v) || "CHARGE_DOSSIER".equals(v) || "RESPONSABLE_CONTENTIEUX".equals(v);
        });
    }

    @Transactional
    public NoteHonoraireDtos.NoteResponse create(Authentication authentication, NoteHonoraireDtos.CreateNoteRequest request) {
        PrestataireEntity prestataire = resolvePrestataire(authentication, request.prestataireId());
        DossierContentieuxEntity dossier = dossierRepository.findById(request.dossierId())
                .orElseThrow(() -> new RuntimeException("Dossier non trouvé"));

        BigDecimal honoraires = nvl(request.montantHonoraires(), BigDecimal.ZERO);
        BigDecimal frais = nvl(request.fraisAdministratifs(), BigDecimal.ZERO);
        BigDecimal base = honoraires.add(frais);
        BigDecimal tva = base.multiply(new BigDecimal("0.19")).setScale(3, RoundingMode.HALF_UP);
        BigDecimal total = base.add(tva).setScale(3, RoundingMode.HALF_UP);

        NoteHonoraireEntity entity = new NoteHonoraireEntity();
        entity.setPrestataire(prestataire);
        entity.setDossier(dossier);
        entity.setTypeLien(request.typeLien());
        entity.setReferenceLien(request.referenceLien());
        entity.setMontantHonoraires(honoraires.setScale(3, RoundingMode.HALF_UP));
        entity.setFraisAdministratifs(frais.setScale(3, RoundingMode.HALF_UP));
        entity.setTva(tva);
        entity.setTotal(total);
        entity.setFichierJustificatif(request.fichierJustificatif());
        entity.setStatut(NoteHonoraireStatus.EN_COURS);

        NoteHonoraireEntity saved = repository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public NoteHonoraireDtos.NoteResponse update(Long id, NoteHonoraireDtos.CreateNoteRequest request) {
        NoteHonoraireEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note non trouvée"));

        if (entity.getStatut() == NoteHonoraireStatus.SOUMISE || entity.getStatut() == NoteHonoraireStatus.VALIDEE) {
            throw new RuntimeException("Impossible de modifier une note soumise ou validée");
        }

        DossierContentieuxEntity dossier = dossierRepository.findById(request.dossierId())
                .orElseThrow(() -> new RuntimeException("Dossier non trouvé"));

        BigDecimal honoraires = nvl(request.montantHonoraires(), BigDecimal.ZERO);
        BigDecimal frais = nvl(request.fraisAdministratifs(), BigDecimal.ZERO);
        BigDecimal base = honoraires.add(frais);
        BigDecimal tva = base.multiply(new BigDecimal("0.19")).setScale(3, RoundingMode.HALF_UP);
        BigDecimal total = base.add(tva).setScale(3, RoundingMode.HALF_UP);

        entity.setDossier(dossier);
        entity.setTypeLien(request.typeLien());
        entity.setReferenceLien(request.referenceLien());
        entity.setMontantHonoraires(honoraires.setScale(3, RoundingMode.HALF_UP));
        entity.setFraisAdministratifs(frais.setScale(3, RoundingMode.HALF_UP));
        entity.setTva(tva);
        entity.setTotal(total);
        if (request.fichierJustificatif() != null) {
            entity.setFichierJustificatif(request.fichierJustificatif());
        }

        NoteHonoraireEntity saved = repository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public void submit(Long id) {
        NoteHonoraireEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note non trouvée"));
        if (entity.getStatut() != NoteHonoraireStatus.EN_COURS && entity.getStatut() != NoteHonoraireStatus.REJETEE) {
            throw new RuntimeException("Statut invalide pour la soumission");
        }
        entity.setStatut(NoteHonoraireStatus.SOUMISE);
        repository.save(entity);
    }

    @Transactional
    public void validate(Long id) {
        NoteHonoraireEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note non trouvée"));
        if (entity.getStatut() != NoteHonoraireStatus.SOUMISE) {
            throw new RuntimeException("La note doit être soumise pour être validée");
        }
        entity.setStatut(NoteHonoraireStatus.VALIDEE);
        repository.save(entity);

        // Convertir automatiquement en Facture validée
        FactureDto facture = new FactureDto();
        facture.setNumero("FAC-" + entity.getNumero());
        facture.setMontantHt(entity.getMontantHonoraires().add(entity.getFraisAdministratifs()).doubleValue());
        facture.setTva(19.0);
        facture.setMontantTtc(entity.getTotal().doubleValue());
        facture.setMontantPaye(0.0);
        facture.setResteAPayer(entity.getTotal().doubleValue());
        facture.setStatut(FactureStatus.VALIDEE);
        facture.setDateFacture(LocalDate.now());
        facture.setTypeLien(entity.getTypeLien());
        facture.setReferenceLien(entity.getReferenceLien());
        facture.setPrestataireId(entity.getPrestataire().getId());
        facture.setFichierJustificatif(entity.getFichierJustificatif());

        factureService.create(facture);
    }

    @Transactional
    public void reject(Long id) {
        NoteHonoraireEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note non trouvée"));
        if (entity.getStatut() != NoteHonoraireStatus.SOUMISE) {
            throw new RuntimeException("La note doit être soumise pour être rejetée");
        }
        entity.setStatut(NoteHonoraireStatus.REJETEE);
        repository.save(entity);
    }

    @Transactional
    public void delete(Long id) {
        NoteHonoraireEntity entity = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Note non trouvée"));
        if (entity.getStatut() == NoteHonoraireStatus.VALIDEE) {
            throw new RuntimeException("Impossible de supprimer une note validée");
        }
        repository.delete(entity);
    }

    private NoteHonoraireDtos.NoteResponse toResponse(NoteHonoraireEntity e) {
        DossierContentieuxEntity dossier = e.getDossier();
        PrestataireEntity p = e.getPrestataire();
        String prestataireNom = (p.getPrenom() != null && !p.getPrenom().isBlank())
                ? (p.getPrenom() + " " + p.getNom())
                : p.getNom();
        return new NoteHonoraireDtos.NoteResponse(
                e.getId(),
                e.getNumero(),
                e.getPrestataire().getId(),
                prestataireNom,
                dossier.getId(),
                dossier.getReference(),
                dossier.getCompteActuel(),
                dossier.getAgence(),
                dossier.getMontantEngage(),
                e.getTypeLien(),
                e.getReferenceLien(),
                e.getMontantHonoraires(),
                e.getFraisAdministratifs(),
                e.getTva(),
                e.getTotal(),
                e.getStatut(),
                e.getFichierJustificatif(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }

    private BigDecimal nvl(BigDecimal a, BigDecimal b) {
        if (a != null) return a;
        if (b != null) return b;
        return BigDecimal.ZERO;
    }

    private PrestataireEntity resolvePrestataire(Authentication authentication, Long requestedPrestataireId) {
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            if (requestedPrestataireId != null) {
                return prestataireRepository.findById(requestedPrestataireId)
                        .orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
            }
            throw new RuntimeException("Utilisateur non authentifié");
        }

        String username = authentication.getName();
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        String email = user.getEmail();
        if (email == null || email.isBlank()) {
            email = username;
        }

        PrestataireEntity byEmail = prestataireRepository.findFirstByEmailIgnoreCase(email).orElse(null);
        if (byEmail != null) return byEmail;

        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_CHARGE_DOSSIER".equals(a.getAuthority()));
        if (isAdmin && requestedPrestataireId != null) {
            return prestataireRepository.findById(requestedPrestataireId)
                    .orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
        }

        throw new RuntimeException("Prestataire lié au compte introuvable (vérifiez l'email du profil et du prestataire)");
    }
}
