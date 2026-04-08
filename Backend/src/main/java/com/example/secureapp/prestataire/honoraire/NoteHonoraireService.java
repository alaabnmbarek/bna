package com.example.secureapp.prestataire.honoraire;

import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.prestataire.PrestataireEntity;
import com.example.secureapp.prestataire.PrestataireRepository;
import com.example.secureapp.prestataire.PrestataireType;
import com.example.secureapp.prestataire.honoraire.dto.NoteHonoraireDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
public class NoteHonoraireService {
    private final NoteHonoraireRepository repository;
    private final PrestataireRepository prestataireRepository;
    private final DossierContentieuxRepository dossierRepository;

    public NoteHonoraireService(
            NoteHonoraireRepository repository,
            PrestataireRepository prestataireRepository,
            DossierContentieuxRepository dossierRepository
    ) {
        this.repository = repository;
        this.prestataireRepository = prestataireRepository;
        this.dossierRepository = dossierRepository;
    }

    @Transactional
    public NoteHonoraireDtos.NoteResponse create(Long prestataireId, NoteHonoraireDtos.CreateNoteRequest request) {
        PrestataireEntity prestataire = prestataireRepository.findById(prestataireId)
                .orElseThrow(() -> new RuntimeException("Prestataire non trouvé"));
        if (prestataire.getType() != PrestataireType.AVOCAT) {
            throw new RuntimeException("Note d’honoraire réservée aux avocats");
        }

        Long dossierId = request.dossierId();
        if (dossierId == null) {
            throw new RuntimeException("Dossier obligatoire");
        }

        DossierContentieuxEntity dossier = dossierRepository.findById(dossierId)
                .orElseThrow(() -> new RuntimeException("Dossier non trouvé"));
        if (dossier.isDeleted()) {
            throw new RuntimeException("Dossier non trouvé");
        }

        BigDecimal honoraires = nvl(request.montantHonoraires(), dossier.getMontantHonoraires());
        BigDecimal frais = nvl(request.fraisAdministratifs(), dossier.getFraisAdministratifs());
        BigDecimal base = honoraires.add(frais);
        BigDecimal tva = base.multiply(new BigDecimal("0.19")).setScale(3, RoundingMode.HALF_UP);
        BigDecimal total = base.add(tva).setScale(3, RoundingMode.HALF_UP);

        NoteHonoraireEntity entity = new NoteHonoraireEntity();
        entity.setPrestataire(prestataire);
        entity.setDossier(dossier);
        entity.setMontantHonoraires(honoraires.setScale(3, RoundingMode.HALF_UP));
        entity.setFraisAdministratifs(frais.setScale(3, RoundingMode.HALF_UP));
        entity.setTva(tva);
        entity.setTotal(total);

        NoteHonoraireEntity saved = repository.save(entity);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<NoteHonoraireDtos.NoteResponse> listByPrestataire(Long prestataireId) {
        return repository.findByPrestataireIdOrderByCreatedAtDesc(prestataireId).stream()
                .map(this::toResponse)
                .toList();
    }

    private NoteHonoraireDtos.NoteResponse toResponse(NoteHonoraireEntity e) {
        DossierContentieuxEntity d = e.getDossier();
        return new NoteHonoraireDtos.NoteResponse(
                e.getId(),
                e.getPrestataire().getId(),
                d.getId(),
                d.getReference(),
                d.getObjet(),
                d.getCompteActuel(),
                d.getAgence(),
                d.getMontantEngage(),
                e.getMontantHonoraires(),
                e.getFraisAdministratifs(),
                e.getTva(),
                e.getTotal(),
                e.getCreatedAt()
        );
    }

    private BigDecimal nvl(BigDecimal a, BigDecimal b) {
        if (a != null) return a;
        if (b != null) return b;
        return BigDecimal.ZERO;
    }
}

