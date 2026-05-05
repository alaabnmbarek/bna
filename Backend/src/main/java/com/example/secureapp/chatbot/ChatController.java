package com.example.secureapp.chatbot;

import com.example.secureapp.contentieux.ContentieuxStatus;
import com.example.secureapp.contentieux.DossierContentieuxService;
import com.example.secureapp.contentieux.dto.ContentieuxDtos;
import com.example.secureapp.facture.FactureDto;
import com.example.secureapp.facture.FactureService;
import com.example.secureapp.facture.FactureStatus;
import com.example.secureapp.prestataire.MissionService;
import com.example.secureapp.prestataire.MissionStatus;
import com.example.secureapp.prestataire.PrestataireEntity;
import com.example.secureapp.prestataire.PrestataireRepository;
import com.example.secureapp.prestataire.dto.MissionDto;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@RestController
@RequestMapping("/api")
public class ChatController {
    private static final String NO_RESULT = "Aucun résultat trouvé pour cette demande.";

    private final NlpService nlpService;
    private final FactureService factureService;
    private final DossierContentieuxService dossierService;
    private final MissionService missionService;
    private final UserRepository userRepository;
    private final PrestataireRepository prestataireRepository;

    public ChatController(
            NlpService nlpService,
            FactureService factureService,
            DossierContentieuxService dossierService,
            MissionService missionService,
            UserRepository userRepository,
            PrestataireRepository prestataireRepository
    ) {
        this.nlpService = nlpService;
        this.factureService = factureService;
        this.dossierService = dossierService;
        this.missionService = missionService;
        this.userRepository = userRepository;
        this.prestataireRepository = prestataireRepository;
    }

    @PostMapping("/chat")
    @PreAuthorize("isAuthenticated()")
    public ChatbotDtos.ChatResponse chat(@Valid @RequestBody ChatbotDtos.ChatRequest request, Authentication authentication) {
        String message = request != null && request.message() != null ? request.message().trim() : "";
        int max = request != null && request.maxResults() != null ? Math.max(1, Math.min(20, request.maxResults())) : 10;

        NlpResult parsed = nlpService.parse(message);
        if (parsed.entity() == NlpResult.Entity.UNKNOWN) {
            return notUnderstood();
        }

        return switch (parsed.entity()) {
            case FACTURE -> handleFactures(parsed, authentication, max);
            case DOSSIER -> handleDossiers(parsed, authentication, max);
            case MISSION -> handleMissions(parsed, authentication, max);
            default -> notUnderstood();
        };
    }

    private ChatbotDtos.ChatResponse handleFactures(NlpResult nlp, Authentication authentication, int max) {
        List<FactureDto> rows = factureService.isInternal(authentication)
                ? factureService.getAll()
                : factureService.listMine(authentication);

        FactureStatus filter = mapFactureStatus(nlp.status());
        List<FactureDto> filtered = rows.stream()
                .filter(f -> filter == null || f.getStatut() == filter)
                .limit(max)
                .toList();

        List<ChatbotDtos.ChatItem> items = filtered.stream().map(f -> new ChatbotDtos.ChatItem(
                "FACTURE",
                f.getId(),
                safe(f.getNumero()),
                nonBlankOrNull(f.getReferenceLien()),
                f.getStatut() != null ? f.getStatut().name() : null,
                f.getDateFacture() != null ? f.getDateFacture().toString() : null
        )).toList();

        if (items.isEmpty()) return emptyResult();
        return new ChatbotDtos.ChatResponse("Résultats :", "FACTURE", items, commonSuggestions());
    }

    private ChatbotDtos.ChatResponse handleDossiers(NlpResult nlp, Authentication authentication, int max) {
        List<ContentieuxDtos.DossierResponse> rows = dossierService.list(authentication);
        ContentieuxStatus filter = mapDossierStatus(nlp.status());
        LocalDate today = LocalDate.now();

        List<ContentieuxDtos.DossierResponse> filtered = rows.stream()
                .filter(d -> {
                    if (nlp.status() == NlpResult.Status.LATE) {
                        if (d.statut() == ContentieuxStatus.CLOTURE) return false;
                        if (d.dateOuverture() == null) return false;
                        return d.dateOuverture().plusDays(30).isBefore(today);
                    }
                    return filter == null || d.statut() == filter;
                })
                .limit(max)
                .toList();

        List<ChatbotDtos.ChatItem> items = filtered.stream().map(d -> new ChatbotDtos.ChatItem(
                "DOSSIER",
                d.id(),
                safe(d.reference()),
                nonBlankOrNull(d.nomDebiteur()),
                d.statut() != null ? d.statut().name() : null,
                d.dateOuverture() != null ? d.dateOuverture().toString() : null
        )).toList();

        if (items.isEmpty()) return emptyResult();
        return new ChatbotDtos.ChatResponse("Résultats :", "DOSSIER", items, commonSuggestions());
    }

    private ChatbotDtos.ChatResponse handleMissions(NlpResult nlp, Authentication authentication, int max) {
        List<MissionDto> rows;
        if (isInternal(authentication)) {
            rows = missionService.listAll();
        } else {
            Long pid = resolvePrestataireId(authentication);
            rows = missionService.listByPrestataire(pid);
        }

        LocalDate today = LocalDate.now();
        MissionStatus filter = mapMissionStatus(nlp.status());
        List<MissionDto> filtered = rows.stream()
                .filter(m -> {
                    if (nlp.status() != NlpResult.Status.LATE) return true;
                    if (m.getDateEcheance() == null) return false;
                    if (!m.getDateEcheance().isBefore(today)) return false;
                    MissionStatus s = m.getStatut();
                    return s == MissionStatus.ASSIGNEE || s == MissionStatus.EN_COURS;
                })
                .filter(m -> filter == null || Objects.equals(m.getStatut(), filter))
                .limit(max)
                .toList();

        List<ChatbotDtos.ChatItem> items = filtered.stream().map(m -> new ChatbotDtos.ChatItem(
                "MISSION",
                m.getId(),
                safe(nonBlankOrNull(m.getCodeMission()) != null ? m.getCodeMission() : m.getTitre()),
                nonBlankOrNull(m.getDossierReference()),
                m.getStatut() != null ? m.getStatut().name() : null,
                m.getDateEcheance() != null ? m.getDateEcheance().toString() : null
        )).toList();

        if (items.isEmpty()) return emptyResult();
        return new ChatbotDtos.ChatResponse("Résultats :", "MISSION", items, commonSuggestions());
    }

    private ChatbotDtos.ChatResponse emptyResult() {
        return new ChatbotDtos.ChatResponse(NO_RESULT, "EMPTY", List.of(), commonSuggestions());
    }

    private ChatbotDtos.ChatResponse notUnderstood() {
        return new ChatbotDtos.ChatResponse(
                "Je n’ai pas compris votre demande.",
                "UNKNOWN",
                List.of(),
                commonSuggestions()
        );
    }

    private List<ChatbotDtos.ChatAction> commonSuggestions() {
        return List.of(
                new ChatbotDtos.ChatAction("PROMPT", "💰 Factures payées", "factures payées"),
                new ChatbotDtos.ChatAction("PROMPT", "❌ Factures refusées", "factures refusées"),
                new ChatbotDtos.ChatAction("PROMPT", "📂 Dossiers ouverts", "dossiers ouverts"),
                new ChatbotDtos.ChatAction("PROMPT", "📋 Missions en retard", "missions en retard")
        );
    }

    private FactureStatus mapFactureStatus(NlpResult.Status s) {
        if (s == null) return null;
        return switch (s) {
            case REFUSED -> FactureStatus.REFUSEE;
            case PAID -> FactureStatus.PAYEE;
            case PENDING -> FactureStatus.EN_ATTENTE;
            case IN_PROGRESS -> FactureStatus.EN_COURS;
            case VALIDATED -> FactureStatus.VALIDEE;
            default -> null;
        };
    }

    private ContentieuxStatus mapDossierStatus(NlpResult.Status s) {
        if (s == null) return null;
        return switch (s) {
            case OPEN -> ContentieuxStatus.OUVERT;
            case CLOSED -> ContentieuxStatus.CLOTURE;
            case TO_VALIDATE -> ContentieuxStatus.A_VALIDER;
            default -> null;
        };
    }

    private MissionStatus mapMissionStatus(NlpResult.Status s) {
        if (s == null) return null;
        return switch (s) {
            case ASSIGNED -> MissionStatus.ASSIGNEE;
            case IN_PROGRESS -> MissionStatus.EN_COURS;
            case DONE -> MissionStatus.TERMINEE;
            case CANCELLED -> MissionStatus.ANNULEE;
            case FAILED -> MissionStatus.ECHOUEE;
            default -> null;
        };
    }

    private boolean isInternal(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_ADMIN".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v)
                    || "ADMIN".equals(v) || "CHARGE_DOSSIER".equals(v) || "RESPONSABLE_CONTENTIEUX".equals(v);
        });
    }

    private Long resolvePrestataireId(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        UserEntity user = userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        String email = user.getEmail();
        if (email == null || email.isBlank()) email = username;
        PrestataireEntity p = prestataireRepository.findFirstByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Prestataire lié au compte introuvable"));
        return p.getId();
    }

    private String safe(String v) {
        return v != null ? v : "—";
    }

    private String nonBlankOrNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }
}
