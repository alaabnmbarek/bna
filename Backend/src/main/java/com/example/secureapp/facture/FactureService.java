package com.example.secureapp.facture;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import com.example.secureapp.prestataire.PrestataireEntity;
import com.example.secureapp.prestataire.PrestataireRepository;
import com.example.secureapp.prestataire.MissionEntity;
import com.example.secureapp.prestataire.MissionRepository;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireEntity;
import com.example.secureapp.prestataire.honoraire.NoteHonoraireRepository;
import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireEntity;
import com.example.secureapp.suivi_judiciaire.AffaireJudiciaireRepository;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FactureService {
    
    private final FactureRepository factureRepository;
    private final UserRepository userRepository;
    private final PrestataireRepository prestataireRepository;
    private final MissionRepository missionRepository;
    private final NoteHonoraireRepository noteHonoraireRepository;
    private final AffaireJudiciaireRepository affaireJudiciaireRepository;
    private final DossierContentieuxRepository dossierContentieuxRepository;
    private final Path uploadDir = Paths.get("uploads", "factures");

    public FactureService(FactureRepository factureRepository, UserRepository userRepository, PrestataireRepository prestataireRepository, MissionRepository missionRepository, NoteHonoraireRepository noteHonoraireRepository, AffaireJudiciaireRepository affaireJudiciaireRepository, DossierContentieuxRepository dossierContentieuxRepository) {
        this.factureRepository = factureRepository;
        this.userRepository = userRepository;
        this.prestataireRepository = prestataireRepository;
        this.missionRepository = missionRepository;
        this.noteHonoraireRepository = noteHonoraireRepository;
        this.affaireJudiciaireRepository = affaireJudiciaireRepository;
        this.dossierContentieuxRepository = dossierContentieuxRepository;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<FactureDto> getAll() {
        List<FactureEntity> all = factureRepository.findAll();
        System.out.println("[DEBUG] FactureService.getAll - Nombre de factures trouvées en base: " + all.size());
        return all.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public List<FactureDto> getByPrestataireId(Long prestataireId) {
        List<FactureEntity> mine = factureRepository.findByPrestataireIdOrderByDateFactureDesc(prestataireId);
        System.out.println("[DEBUG] FactureService.getByPrestataireId - ID Prestataire: " + prestataireId + ", Nombre: " + mine.size());
        return mine.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @org.springframework.transaction.annotation.Transactional
    public List<FactureDto> listMine(Authentication authentication) {
        PrestataireEntity p = resolvePrestataire(authentication);
        backfillPrestataireIdForNullFactures();
        return getByPrestataireId(p.getId());
    }

    private void backfillPrestataireIdForNullFactures() {
        List<FactureEntity> nullPrestataires = factureRepository.findByPrestataireIdIsNull();
        for (FactureEntity f : nullPrestataires) {
            Long resolved = resolvePrestataireIdForFacture(f);
            if (resolved != null) {
                f.setPrestataireId(resolved);
                factureRepository.save(f);
            }
        }
    }

    public boolean isInternal(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_ADMIN".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v)
                    || "ADMIN".equals(v) || "CHARGE_DOSSIER".equals(v) || "RESPONSABLE_CONTENTIEUX".equals(v);
        });
    }

    public Long currentPrestataireId(Authentication authentication) {
        return resolvePrestataire(authentication).getId();
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public FactureDto getById(Long id) {
        FactureEntity entity = factureRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Facture non trouvée"));
        return mapToDto(entity);
    }

    @org.springframework.transaction.annotation.Transactional
    public FactureDto create(FactureDto dto) {
        System.out.println("[DEBUG] FactureService.create - Numero: " + dto.getNumero() + ", Prestataire: " + dto.getPrestataireId());
        FactureEntity entity = new FactureEntity();
        BeanUtils.copyProperties(dto, entity, "id", "createdAt", "updatedAt", "prestations");
        
        if (dto.getPrestations() != null) {
            System.out.println("[DEBUG] Ajout de " + dto.getPrestations().size() + " prestations à l'entité");
            for (FactureDto.PrestationDto pDto : dto.getPrestations()) {
                FacturePrestationEntity pEntity = new FacturePrestationEntity();
                BeanUtils.copyProperties(pDto, pEntity);
                pEntity.setFacture(entity);
                entity.getPrestations().add(pEntity);
            }
        }

        if (entity.getPrestataireId() == null) {
            Long resolved = resolvePrestataireIdForFacture(entity);
            if (resolved != null) entity.setPrestataireId(resolved);
        }
        if (entity.getPrestataireId() == null) {
            throw new RuntimeException("Prestataire obligatoire pour créer une facture (prestataireId ou lien univoque requis)");
        }
        
        entity.calculateReste();
        try {
            entity = factureRepository.save(entity);
            System.out.println("[DEBUG] Facture sauvegardée en base, ID: " + entity.getId());
        } catch (Exception e) {
            System.err.println("[ERROR] Echec de sauvegarde de la facture: " + e.getMessage());
            throw e;
        }
        return mapToDto(entity);
    }

    @org.springframework.transaction.annotation.Transactional
    public FactureDto update(Long id, FactureDto dto, Authentication authentication) {
        FactureEntity entity = factureRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Facture non trouvée"));

        FactureStatus previousStatus = entity.getStatut();
        BeanUtils.copyProperties(dto, entity, "id", "createdAt", "updatedAt", "prestations");
        
        entity.getPrestations().clear();
        if (dto.getPrestations() != null) {
            for (FactureDto.PrestationDto pDto : dto.getPrestations()) {
                FacturePrestationEntity pEntity = new FacturePrestationEntity();
                BeanUtils.copyProperties(pDto, pEntity);
                pEntity.setFacture(entity);
                entity.getPrestations().add(pEntity);
            }
        }

        if (previousStatus != FactureStatus.VALIDEE && entity.getStatut() == FactureStatus.VALIDEE) {
            if (authentication == null || !hasAnyAuthority(authentication, "ROLE_RESPONSABLE_CONTENTIEUX", "ROLE_ADMIN", "RESPONSABLE_CONTENTIEUX", "ADMIN")) {
                throw new AccessDeniedException("Accès refusé");
            }
        }

        if (entity.getPrestataireId() == null) {
            Long resolved = resolvePrestataireIdForFacture(entity);
            if (resolved != null) entity.setPrestataireId(resolved);
        }
        if (entity.getPrestataireId() == null) {
            throw new RuntimeException("Prestataire obligatoire (prestataireId ou lien univoque requis)");
        }

        entity.calculateReste();
        entity = factureRepository.save(entity);
        return mapToDto(entity);
    }

    @org.springframework.transaction.annotation.Transactional
    public void delete(Long id) {
        factureRepository.deleteById(id);
    }

    public FactureImportResponse importFromFile(MultipartFile file, Authentication authentication) {
        if (file == null || file.isEmpty()) throw new RuntimeException("Fichier invalide");

        ensureUploadDir();
        String storedName = storeFile(file);

        FactureImportResponse response = new FactureImportResponse();
        FactureImportResponse.Extracted extracted = new FactureImportResponse.Extracted();
        extracted.setWarnings(new ArrayList<>());

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : storedName;
        String contentType = file.getContentType() != null ? file.getContentType() : "";

        String text = null;
        if (contentType.toLowerCase(Locale.ROOT).contains("pdf") || originalName.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            text = extractPdfText(file, extracted.getWarnings());
        }

        String numero = firstNonBlank(
                extractNumero(text),
                extractNumero(originalName),
                generateNumero()
        );
        numero = ensureUniqueNumero(numero);

        LocalDate date = extractDate(text);
        if (date == null) date = extractDate(originalName);
        if (date == null) date = LocalDate.now();

        Double ht = extractAmount(text, "(?i)(montant\\s*ht|\\bht\\b)\\s*[:=]?\\s*([0-9][0-9\\s.,]*)");
        Double ttc = extractAmount(text, "(?i)(montant\\s*ttc|\\bttc\\b)\\s*[:=]?\\s*([0-9][0-9\\s.,]*)");
        Double tvaValue = extractAmount(text, "(?i)(montant\\s*tva|\\btva\\b)\\s*[:=]?\\s*([0-9][0-9\\s.,]*)");
        Double tvaPercent = extractPercent(text);

        if (ht == null && ttc != null && tvaValue != null) {
            ht = round3(ttc - tvaValue);
        }

        if (tvaPercent == null && ht != null && tvaValue != null && ht > 0) {
            tvaPercent = round3((tvaValue / ht) * 100.0);
        }
        if (tvaPercent == null) tvaPercent = 19.0;

        if (ht == null) {
            ht = 0.0;
            extracted.getWarnings().add("Montant HT non détecté");
        }

        Double computedTtc = round3(ht * (1.0 + (tvaPercent / 100.0)));
        if (ttc == null) {
            ttc = computedTtc;
        }

        FactureEntity entity = new FactureEntity();
        entity.setNumero(numero);
        entity.setDateFacture(date);
        entity.setMontantHt(round3(ht));
        entity.setTva(round3(tvaPercent));
        entity.setMontantTtc(round3(ttc));
        entity.setMontantPaye(0.0);
        entity.setStatut(FactureStatus.EN_COURS);
        entity.setFichierJustificatif(storedName);
        if (!isInternal(authentication)) {
            try {
                PrestataireEntity p = resolvePrestataire(authentication);
                entity.setPrestataireId(p.getId());
            } catch (RuntimeException ignored) {
            }
        }
        entity.calculateReste();

        FactureEntity saved = factureRepository.save(entity);
        FactureDto dto = mapToDto(saved);

        extracted.setNumero(saved.getNumero());
        extracted.setDateFacture(saved.getDateFacture() != null ? saved.getDateFacture().toString() : null);
        extracted.setMontantHt(saved.getMontantHt());
        extracted.setTva(saved.getTva());
        extracted.setMontantTtc(saved.getMontantTtc());

        response.setFacture(dto);
        response.setExtracted(extracted);
        response.setFileUrl("/api/factures/" + saved.getId() + "/file");
        return response;
    }

    public Resource loadFactureFile(Long factureId) {
        FactureEntity entity = factureRepository.findById(factureId)
                .orElseThrow(() -> new RuntimeException("Facture non trouvée"));
        if (entity.getFichierJustificatif() == null || entity.getFichierJustificatif().isBlank()) {
            throw new RuntimeException("Aucun fichier associé");
        }
        Path p = uploadDir.resolve(entity.getFichierJustificatif());
        if (!Files.exists(p)) throw new RuntimeException("Fichier introuvable");
        return new FileSystemResource(p);
    }

    @org.springframework.transaction.annotation.Transactional
    public FactureDto attachFile(Long factureId, MultipartFile file, Authentication authentication) {
        if (file == null || file.isEmpty()) throw new RuntimeException("Fichier invalide");
        FactureEntity entity = factureRepository.findById(factureId)
                .orElseThrow(() -> new RuntimeException("Facture non trouvée"));
        if (!isInternal(authentication)) {
            Long pid = currentPrestataireId(authentication);
            if (entity.getPrestataireId() == null || !entity.getPrestataireId().equals(pid)) {
                throw new AccessDeniedException("Accès refusé");
            }
        }
        ensureUploadDir();
        String stored = storeFile(file);
        entity.setFichierJustificatif(stored);
        entity = factureRepository.save(entity);
        return mapToDto(entity);
    }

    private FactureDto mapToDto(FactureEntity entity) {
        FactureDto dto = new FactureDto();
        BeanUtils.copyProperties(entity, dto, "prestations");
        if (entity.getPrestations() != null) {
            dto.setPrestations(entity.getPrestations().stream().map(p -> {
                FactureDto.PrestationDto pDto = new FactureDto.PrestationDto();
                BeanUtils.copyProperties(p, pDto);
                return pDto;
            }).collect(Collectors.toList()));
        }
        return dto;
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

    private boolean hasAnyAuthority(Authentication authentication, String... authorities) {
        if (authentication == null || authorities == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            if (v == null) return false;
            for (String wanted : authorities) {
                if (wanted != null && wanted.equals(v)) return true;
            }
            return false;
        });
    }

    private Long resolvePrestataireIdForFacture(FactureEntity entity) {
        if (entity == null) return null;
        if (entity.getPrestataireId() != null) return entity.getPrestataireId();

        Set<Long> candidates = new LinkedHashSet<>();

        if (entity.getNoteHonoraireId() != null) {
            NoteHonoraireEntity note = noteHonoraireRepository.findById(entity.getNoteHonoraireId()).orElse(null);
            if (note != null && note.getPrestataire() != null && note.getPrestataire().getId() != null) {
                candidates.add(note.getPrestataire().getId());
            }
        }

        if (entity.getTypeLien() == null || entity.getReferenceLien() == null || entity.getReferenceLien().isBlank()) {
            return candidates.size() == 1 ? candidates.iterator().next() : null;
        }

        String ref = entity.getReferenceLien().trim();

        if (entity.getTypeLien() == TypeLien.MISSION) {
            try {
                Long missionId = Long.parseLong(ref);
                MissionEntity mission = missionRepository.findById(missionId).orElse(null);
                if (mission != null && mission.getPrestataire() != null && mission.getPrestataire().getId() != null) {
                    candidates.add(mission.getPrestataire().getId());
                }
            } catch (NumberFormatException ignored) {
            }
        }

        if (entity.getTypeLien() == TypeLien.DOSSIER) {
            List<MissionEntity> missions = missionRepository.findByDossierReferenceOrderByCreatedAtDesc(ref);
            for (MissionEntity m : missions) {
                if (m != null && m.getPrestataire() != null && m.getPrestataire().getId() != null) {
                    candidates.add(m.getPrestataire().getId());
                }
            }

            DossierContentieuxEntity dossier = dossierContentieuxRepository.findByReference(ref)
                    .or(() -> dossierContentieuxRepository.findTopByCompteActuelOrderByCreatedAtDesc(ref))
                    .or(() -> dossierContentieuxRepository.findTopByAncienCompteOrderByCreatedAtDesc(ref))
                    .orElse(null);
            if (dossier != null && dossier.getId() != null) {
                List<AffaireJudiciaireEntity> affaires = affaireJudiciaireRepository.findByDossierContentieuxId(dossier.getId());
                for (AffaireJudiciaireEntity a : affaires) {
                    if (a == null) continue;
                    if (a.getAvocat() != null && a.getAvocat().getId() != null) candidates.add(a.getAvocat().getId());
                    if (a.getHuissier() != null && a.getHuissier().getId() != null) candidates.add(a.getHuissier().getId());
                }
            }
        }

        if (entity.getTypeLien() == TypeLien.AFFAIRE) {
            AffaireJudiciaireEntity affaire = null;
            try {
                Long affaireId = Long.parseLong(ref);
                affaire = affaireJudiciaireRepository.findById(affaireId).orElse(null);
            } catch (NumberFormatException ignored) {
                affaire = affaireJudiciaireRepository.findFirstByReferenceTribunalIgnoreCase(ref).orElse(null);
            }
            if (affaire != null) {
                if (affaire.getAvocat() != null && affaire.getAvocat().getId() != null) candidates.add(affaire.getAvocat().getId());
                if (affaire.getHuissier() != null && affaire.getHuissier().getId() != null) candidates.add(affaire.getHuissier().getId());
            }
        }

        return candidates.size() == 1 ? candidates.iterator().next() : null;
    }

    private void ensureUploadDir() {
        try {
            Files.createDirectories(uploadDir);
        } catch (IOException e) {
            throw new RuntimeException("Impossible de créer le dossier d'upload", e);
        }
    }

    private String storeFile(MultipartFile file) {
        String clean = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "facture");
        String name = UUID.randomUUID() + "_" + clean.replaceAll("[\\\\/]+", "_");
        try {
            Files.copy(file.getInputStream(), uploadDir.resolve(name));
        } catch (IOException e) {
            throw new RuntimeException("Upload échoué", e);
        }
        return name;
    }

    private String extractPdfText(MultipartFile file, List<String> warnings) {
        try {
            byte[] bytes = file.getBytes();
            try (PDDocument doc = PDDocument.load(new ByteArrayInputStream(bytes))) {
                PDFTextStripper stripper = new PDFTextStripper();
                return stripper.getText(doc);
            }
        } catch (Exception ex) {
            warnings.add("Extraction PDF non disponible");
            return null;
        }
    }

    private String extractNumero(String text) {
        if (text == null) return null;
        Pattern p = Pattern.compile("(?i)(facture\\s*(n|no|n°|num(?:e|é)ro)?\\s*[:#]?\\s*)([A-Z0-9][A-Z0-9\\-_/\\.]{2,})");
        Matcher m = p.matcher(text);
        if (m.find()) return m.group(3);
        Pattern p2 = Pattern.compile("(?i)\\b(FAC[-_ ]?\\d{4,}|NH[-_ ]?\\d{4,})\\b");
        Matcher m2 = p2.matcher(text);
        if (m2.find()) return m2.group(1).replace(" ", "");
        return null;
    }

    private LocalDate extractDate(String text) {
        if (text == null) return null;
        Pattern p = Pattern.compile("\\b(\\d{2}/\\d{2}/\\d{4})\\b");
        Matcher m = p.matcher(text);
        if (m.find()) {
            try {
                return LocalDate.parse(m.group(1), DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } catch (DateTimeParseException ignored) {
            }
        }
        Pattern p2 = Pattern.compile("\\b(\\d{4}-\\d{2}-\\d{2})\\b");
        Matcher m2 = p2.matcher(text);
        if (m2.find()) {
            try {
                return LocalDate.parse(m2.group(1));
            } catch (DateTimeParseException ignored) {
            }
        }
        return null;
    }

    private Double extractPercent(String text) {
        if (text == null) return null;
        Pattern p = Pattern.compile("(?i)\\btva\\b\\s*\\(?\\s*(\\d{1,2}(?:[\\.,]\\d+)?)\\s*%\\s*\\)?");
        Matcher m = p.matcher(text);
        if (m.find()) return round3(parseNumber(m.group(1)));
        return null;
    }

    private Double extractAmount(String text, String regex) {
        if (text == null) return null;
        Pattern p = Pattern.compile(regex);
        Matcher m = p.matcher(text);
        if (!m.find()) return null;
        String raw = m.group(2);
        Double n = parseNumber(raw);
        if (n == null) return null;
        return round3(n);
    }

    private Double parseNumber(String raw) {
        if (raw == null) return null;
        String s = raw.replaceAll("\\s", "").replace(",", ".");
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double round3(Double v) {
        if (v == null) return null;
        return Math.round(v * 1000.0) / 1000.0;
    }

    private String generateNumero() {
        String d = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        int rnd = (int) (Math.random() * 9000) + 1000;
        return "FAC-" + d + "-" + rnd;
    }

    private String ensureUniqueNumero(String numero) {
        String n = numero;
        int i = 0;
        while (factureRepository.existsByNumero(n) && i < 20) {
            n = numero + "-" + ((int) (Math.random() * 90) + 10);
            i++;
        }
        return n;
    }

    private String firstNonBlank(String... vals) {
        for (String v : vals) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }
}
