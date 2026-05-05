package com.example.secureapp.chatbot;

import com.example.secureapp.contentieux.ContentieuxStatus;
import com.example.secureapp.contentieux.DossierContentieuxEntity;
import com.example.secureapp.contentieux.DossierContentieuxRepository;
import com.example.secureapp.facture.FactureEntity;
import com.example.secureapp.facture.FactureRepository;
import com.example.secureapp.facture.FactureStatus;
import com.example.secureapp.notification.NotificationEntity;
import com.example.secureapp.notification.NotificationRepository;
import com.example.secureapp.prestataire.MissionEntity;
import com.example.secureapp.prestataire.MissionRepository;
import com.example.secureapp.prestataire.MissionStatus;
import com.example.secureapp.prestataire.PrestataireEntity;
import com.example.secureapp.prestataire.PrestataireRepository;
import com.example.secureapp.suivi_judiciaire.SuiviJudiciaireService;
import com.example.secureapp.suivi_judiciaire.dto.AffaireJudiciaireDto;
import com.example.secureapp.suivi_judiciaire.dto.AudienceDto;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.Nullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.support.RestGatewaySupport;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

import org.springframework.security.core.Authentication;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ChatbotService {
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final String NO_RESULT = "Aucun résultat trouvé pour cette demande.";

    private final DossierContentieuxRepository dossierRepository;
    private final MissionRepository missionRepository;
    private final FactureRepository factureRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final PrestataireRepository prestataireRepository;
    private final SuiviJudiciaireService suiviJudiciaireService;
    private final ObjectMapper objectMapper;

    private final boolean aiEnabled;
    private final String aiBaseUrl;
    private final String aiApiKey;
    private final String aiModel;
    private final int aiTimeoutMs;

    private final int dossierOverdueDays;

    public ChatbotService(
            DossierContentieuxRepository dossierRepository,
            MissionRepository missionRepository,
            FactureRepository factureRepository,
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            PrestataireRepository prestataireRepository,
            SuiviJudiciaireService suiviJudiciaireService,
            ObjectMapper objectMapper,
            @Value("${chatbot.ai.enabled:false}") boolean aiEnabled,
            @Value("${chatbot.ai.base-url:https://api.openai.com}") String aiBaseUrl,
            @Value("${chatbot.ai.api-key:}") String aiApiKey,
            @Value("${chatbot.ai.model:gpt-4.1-mini}") String aiModel,
            @Value("${chatbot.ai.timeout-ms:8000}") int aiTimeoutMs,
            @Value("${chatbot.rules.dossier-overdue-days:30}") int dossierOverdueDays
    ) {
        this.dossierRepository = dossierRepository;
        this.missionRepository = missionRepository;
        this.factureRepository = factureRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.prestataireRepository = prestataireRepository;
        this.suiviJudiciaireService = suiviJudiciaireService;
        this.objectMapper = objectMapper;
        this.aiEnabled = aiEnabled;
        this.aiBaseUrl = aiBaseUrl;
        this.aiApiKey = aiApiKey;
        this.aiModel = aiModel;
        this.aiTimeoutMs = aiTimeoutMs;
        this.dossierOverdueDays = dossierOverdueDays;
    }

    public ChatbotDtos.ChatResponse handle(ChatbotDtos.ChatRequest request, Authentication authentication) {
        String raw = request != null ? request.message() : null;
        String message = raw != null ? raw.trim() : "";
        if (message.isEmpty()) {
            return help();
        }

        int maxResults = request != null && request.maxResults() != null ? Math.max(1, Math.min(20, request.maxResults())) : 8;
        Query query = extractQuery(message);

        try {
            return switch (query.intent) {
                case HELP -> help();
                case DOSSIERS -> handleDossiers(query, authentication, maxResults);
                case MISSIONS -> handleMissions(query, authentication, maxResults);
                case FACTURES -> handleFactures(query, authentication, maxResults);
                case AUDIENCES, AFFAIRES -> handleJudiciaire(query, authentication, maxResults);
                case ALERTES -> handleAlertes(query, authentication, maxResults);
                case UNKNOWN -> unknown();
            };
        } catch (RuntimeException ex) {
            return new ChatbotDtos.ChatResponse(
                    "Je n’ai pas pu traiter cette demande. " + safeMessage(ex.getMessage()),
                    "ERROR",
                    List.of(),
                    List.of()
            );
        }
    }

    private ChatbotDtos.ChatResponse handleDossiers(Query query, Authentication authentication, int maxResults) {
        if (!hasAuthority(authentication, "CONTENTIOUS_READ")) {
            return forbidden("DOSSIERS");
        }

        List<DossierContentieuxEntity> rows;
        PageRequest page = PageRequest.of(0, maxResults);

        if (isChargeDossier(authentication)) {
            UserEntity me = requireCurrentUser(authentication);
            rows = dossierRepository.findAccessibleForCharge(me.getId(), resolveUserLabel(me), page);
        } else {
            rows = dossierRepository.findByDeletedFalseOrderByCreatedAtDesc(page);
        }

        List<DossierContentieuxEntity> filtered = applyDossierFilters(rows, query);
        List<ChatbotDtos.ChatItem> items = filtered.stream().limit(maxResults).map(d -> new ChatbotDtos.ChatItem(
                "DOSSIER",
                d.getId(),
                safe(d.getReference()) + " — " + safe(d.getNomDebiteur()),
                nonBlankOrNull(d.getObjet()),
                d.getStatut() != null ? d.getStatut().name() : null,
                d.getDateOuverture() != null ? d.getDateOuverture().format(DATE) : null
        )).toList();

        String label = switch (query.statusFilter) {
            case OPEN -> "ouverts";
            case CLOSED -> "clôturés";
            case TO_VALIDATE -> "à valider";
            default -> "récents";
        };
        if (query.overdue) label = "en retard";

        String answer = items.isEmpty() ? NO_RESULT : "Dossiers " + label + ".";

        return new ChatbotDtos.ChatResponse(
                answer,
                "DOSSIERS",
                items,
                List.of(
                        new ChatbotDtos.ChatAction("NAVIGATE", "Ouvrir Contentieux", "/contentieux"),
                        new ChatbotDtos.ChatAction("PROMPT", "📂 Dossiers ouverts", "dossiers ouverts"),
                        new ChatbotDtos.ChatAction("PROMPT", "📋 Missions en retard", "missions en retard"),
                        new ChatbotDtos.ChatAction("PROMPT", "💰 Factures payées", "factures payées"),
                        new ChatbotDtos.ChatAction("PROMPT", "⚖️ Audiences cette semaine", "audiences cette semaine"),
                        new ChatbotDtos.ChatAction("PROMPT", "🔔 Mes alertes", "mes alertes")
                )
        );
    }

    private List<DossierContentieuxEntity> applyDossierFilters(List<DossierContentieuxEntity> rows, Query query) {
        if (rows == null || rows.isEmpty()) return List.of();

        LocalDate today = LocalDate.now();
        return rows.stream()
                .filter(d -> {
                    ContentieuxStatus s = d.getStatut();
                    if (query.statusFilter == StatusFilter.OPEN) {
                        return s != ContentieuxStatus.CLOTURE && s != ContentieuxStatus.REJETE;
                    }
                    if (query.statusFilter == StatusFilter.CLOSED) {
                        return s == ContentieuxStatus.CLOTURE;
                    }
                    if (query.statusFilter == StatusFilter.TO_VALIDATE) {
                        return s == ContentieuxStatus.A_VALIDER;
                    }
                    return true;
                })
                .filter(d -> {
                    if (!query.overdue) return true;
                    ContentieuxStatus s = d.getStatut();
                    if (s == ContentieuxStatus.CLOTURE || s == ContentieuxStatus.REJETE) return false;
                    LocalDate opened = d.getDateOuverture();
                    if (opened == null) return false;
                    return opened.plusDays(dossierOverdueDays).isBefore(today);
                })
                .toList();
    }

    private ChatbotDtos.ChatResponse handleMissions(Query query, Authentication authentication, int maxResults) {
        boolean internal = isInternal(authentication);
        boolean canListAll = hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_CHARGE_DOSSIER", "ROLE_RESPONSABLE_CONTENTIEUX");
        boolean listAll = internal && canListAll && query.scope == Scope.ALL;

        if (!listAll && !canReadMyMissions(authentication)) {
            return forbidden("MISSIONS");
        }

        List<MissionEntity> rows;
        PageRequest page = PageRequest.of(0, maxResults);
        if (listAll) {
            rows = missionRepository.findAllByOrderByCreatedAtDesc(page);
        } else {
            Long pid = resolvePrestataireId(authentication);
            rows = missionRepository.findByPrestataireIdOrderByCreatedAtDesc(pid, page);
        }

        List<MissionEntity> filtered = applyMissionFilters(rows, query);
        List<ChatbotDtos.ChatItem> items = filtered.stream().limit(maxResults).map(m -> new ChatbotDtos.ChatItem(
                "MISSION",
                m.getId(),
                safe(missionCode(m)) + " — " + safe(m.getTitre()),
                nonBlankOrNull(m.getDossierReference()),
                m.getStatut() != null ? m.getStatut().name() : null,
                m.getDateEcheance() != null ? m.getDateEcheance().format(DATE) : null
        )).toList();

        String label = listAll ? "toutes les missions" : "vos missions";
        if (query.overdue) label = label + " en retard";
        else if (query.statusFilter == StatusFilter.OPEN) label = label + " en cours";
        else if (query.statusFilter == StatusFilter.CLOSED) label = label + " terminées";

        String answer = items.isEmpty() ? NO_RESULT : "Missions : " + label + ".";

        return new ChatbotDtos.ChatResponse(
                answer,
                "MISSIONS",
                items,
                List.of(
                        new ChatbotDtos.ChatAction("NAVIGATE", "Ouvrir Missions", "/missions"),
                        new ChatbotDtos.ChatAction("PROMPT", "📂 Dossiers ouverts", "dossiers ouverts"),
                        new ChatbotDtos.ChatAction("PROMPT", "📋 Missions en retard", "missions en retard"),
                        new ChatbotDtos.ChatAction("PROMPT", "💰 Factures payées", "factures payées"),
                        new ChatbotDtos.ChatAction("PROMPT", "⚖️ Audiences cette semaine", "audiences cette semaine"),
                        new ChatbotDtos.ChatAction("PROMPT", "🔔 Mes alertes", "mes alertes")
                )
        );
    }

    private List<MissionEntity> applyMissionFilters(List<MissionEntity> rows, Query query) {
        if (rows == null || rows.isEmpty()) return List.of();
        LocalDate today = LocalDate.now();
        return rows.stream()
                .filter(m -> {
                    MissionStatus s = m.getStatut();
                    if (query.statusFilter == StatusFilter.OPEN) {
                        return s == MissionStatus.EN_COURS || s == MissionStatus.ASSIGNEE;
                    }
                    if (query.statusFilter == StatusFilter.CLOSED) {
                        return s == MissionStatus.TERMINEE;
                    }
                    return true;
                })
                .filter(m -> {
                    if (!query.overdue) return true;
                    MissionStatus s = m.getStatut();
                    if (s == MissionStatus.TERMINEE || s == MissionStatus.ANNULEE || s == MissionStatus.ECHOUEE) return false;
                    LocalDate due = m.getDateEcheance();
                    return due != null && due.isBefore(today);
                })
                .toList();
    }

    private ChatbotDtos.ChatResponse handleFactures(Query query, Authentication authentication, int maxResults) {
        if (!canReadFactures(authentication)) {
            return forbidden("FACTURES");
        }

        boolean internal = isInternal(authentication);
        PageRequest page = PageRequest.of(0, maxResults);

        List<FactureEntity> rows;
        if (internal && query.scope == Scope.ALL) {
            rows = factureRepository.findAllByOrderByDateFactureDesc(page);
        } else if (internal) {
            rows = factureRepository.findAllByOrderByDateFactureDesc(page);
        } else {
            Long pid = resolvePrestataireId(authentication);
            rows = factureRepository.findByPrestataireIdOrderByDateFactureDesc(pid, page);
        }

        List<FactureEntity> filtered = applyFactureFilters(rows, query);
        List<ChatbotDtos.ChatItem> items = filtered.stream().limit(maxResults).map(f -> new ChatbotDtos.ChatItem(
                "FACTURE",
                f.getId(),
                safe(f.getNumero()) + " — " + money(f.getMontantTtc()),
                nonBlankOrNull(f.getReferenceLien()),
                f.getStatut() != null ? f.getStatut().name() : null,
                f.getDateFacture() != null ? f.getDateFacture().format(DATE) : null
        )).toList();

        String label = internal ? "les factures" : "vos factures";
        if (query.factureStatus != null) label = label + " " + query.factureStatus.name().toLowerCase();

        String answer = items.isEmpty() ? NO_RESULT : "Factures : " + label + ".";

        return new ChatbotDtos.ChatResponse(
                answer,
                "FACTURES",
                items,
                List.of(
                        new ChatbotDtos.ChatAction("NAVIGATE", "Ouvrir Factures", "/factures"),
                        new ChatbotDtos.ChatAction("PROMPT", "📂 Dossiers ouverts", "dossiers ouverts"),
                        new ChatbotDtos.ChatAction("PROMPT", "📋 Missions en retard", "missions en retard"),
                        new ChatbotDtos.ChatAction("PROMPT", "💰 Factures payées", "factures payées"),
                        new ChatbotDtos.ChatAction("PROMPT", "⚖️ Audiences cette semaine", "audiences cette semaine"),
                        new ChatbotDtos.ChatAction("PROMPT", "🔔 Mes alertes", "mes alertes")
                )
        );
    }

    private List<FactureEntity> applyFactureFilters(List<FactureEntity> rows, Query query) {
        if (rows == null || rows.isEmpty()) return List.of();
        return rows.stream()
                .filter(f -> query.factureStatus == null || f.getStatut() == query.factureStatus)
                .toList();
    }

    private ChatbotDtos.ChatResponse handleJudiciaire(Query query, Authentication authentication, int maxResults) {
        if (!canReadJudiciaire(authentication)) {
            return forbidden("JUDICIAIRE");
        }

        if (query.intent == Intent.AFFAIRES) {
            List<AffaireJudiciaireDto> affaires = suiviJudiciaireService.getAllAffaires(authentication);
            List<ChatbotDtos.ChatItem> items = affaires.stream().limit(maxResults).map(a -> new ChatbotDtos.ChatItem(
                    "AFFAIRE",
                    a.id(),
                    safe(a.referenceTribunal()),
                    safe(a.tribunal()) + " — " + safe(a.dossierReference()),
                    a.statut() != null ? a.statut().name() : null,
                    a.dateOuverture() != null ? a.dateOuverture().format(DATE) : null
            )).toList();

            String answer = items.isEmpty() ? NO_RESULT : "Affaires judiciaires.";
            return new ChatbotDtos.ChatResponse(
                    answer,
                    "AFFAIRES",
                    items,
                    List.of(
                            new ChatbotDtos.ChatAction("NAVIGATE", "Ouvrir Suivi judiciaire", "/suivi-judiciaire"),
                            new ChatbotDtos.ChatAction("PROMPT", "⚖️ Audiences cette semaine", "audiences cette semaine"),
                            new ChatbotDtos.ChatAction("PROMPT", "🔔 Mes alertes", "mes alertes")
                    )
            );
        }

        int days = query.daysWindow != null ? Math.max(1, Math.min(60, query.daysWindow)) : 7;
        LocalDateTime start = LocalDateTime.now().minusDays(1);
        LocalDateTime end = LocalDateTime.now().plusDays(days);

        List<AudienceDto> audiences = suiviJudiciaireService.getAudiencier(start, end, authentication);
        List<ChatbotDtos.ChatItem> items = audiences.stream().limit(maxResults).map(a -> new ChatbotDtos.ChatItem(
                "AUDIENCE",
                a.id(),
                safe(a.referenceTribunal()) + " — " + safe(a.objet()),
                nonBlankOrNull(a.tribunal()),
                a.statut() != null ? a.statut().name() : null,
                a.dateAudience() != null ? a.dateAudience().format(DATE_TIME) : null
        )).toList();

        String answer = items.isEmpty() ? NO_RESULT : "Audiences cette période.";
        return new ChatbotDtos.ChatResponse(
                answer,
                "AUDIENCES",
                items,
                List.of(
                        new ChatbotDtos.ChatAction("NAVIGATE", "Ouvrir Suivi judiciaire", "/suivi-judiciaire"),
                        new ChatbotDtos.ChatAction("PROMPT", "⚖️ Audiences cette semaine", "audiences cette semaine"),
                        new ChatbotDtos.ChatAction("PROMPT", "🔔 Mes alertes", "mes alertes")
                )
        );
    }

    private ChatbotDtos.ChatResponse handleAlertes(Query query, Authentication authentication, int maxResults) {
        UserEntity me = requireCurrentUser(authentication);
        PageRequest page = PageRequest.of(0, Math.max(1, Math.min(20, maxResults)));
        List<NotificationEntity> unread = notificationRepository.findByTargetUserIdAndLuFalseOrderByCreatedAtDesc(me.getId(), page);

        List<ChatbotDtos.ChatItem> items = unread.stream().limit(maxResults).map(n -> new ChatbotDtos.ChatItem(
                "ALERTE",
                n.getId(),
                safe(n.getMessage()),
                nonBlankOrNull(n.getResourceType()),
                n.getPriority() != null ? n.getPriority().name() : null,
                n.getCreatedAt() != null ? n.getCreatedAt().format(DATE_TIME) : null
        )).toList();

        String answer = items.isEmpty() ? NO_RESULT : "Alertes non lues.";
        return new ChatbotDtos.ChatResponse(
                answer,
                "ALERTES",
                items,
                List.of(
                        new ChatbotDtos.ChatAction("NAVIGATE", "Ouvrir Notifications", "/admin"),
                        new ChatbotDtos.ChatAction("PROMPT", "📂 Dossiers ouverts", "dossiers ouverts"),
                        new ChatbotDtos.ChatAction("PROMPT", "📋 Missions en retard", "missions en retard"),
                        new ChatbotDtos.ChatAction("PROMPT", "💰 Factures payées", "factures payées"),
                        new ChatbotDtos.ChatAction("PROMPT", "⚖️ Audiences cette semaine", "audiences cette semaine")
                )
        );
    }

    private ChatbotDtos.ChatResponse help() {
        return new ChatbotDtos.ChatResponse(
                "Vous pouvez cliquer une suggestion ou écrire une demande similaire.",
                "HELP",
                List.of(),
                List.of(
                        new ChatbotDtos.ChatAction("PROMPT", "📂 Dossiers ouverts", "dossiers ouverts"),
                        new ChatbotDtos.ChatAction("PROMPT", "📋 Missions en retard", "missions en retard"),
                        new ChatbotDtos.ChatAction("PROMPT", "💰 Factures payées", "factures payées"),
                        new ChatbotDtos.ChatAction("PROMPT", "⚖️ Audiences cette semaine", "audiences cette semaine"),
                        new ChatbotDtos.ChatAction("PROMPT", "🔔 Mes alertes", "mes alertes")
                )
        );
    }

    private ChatbotDtos.ChatResponse unknown() {
        return new ChatbotDtos.ChatResponse(
                "Demande non claire. Essayez une suggestion :",
                "UNKNOWN",
                List.of(),
                List.of(
                        new ChatbotDtos.ChatAction("PROMPT", "💰 Factures payées", "factures payées"),
                        new ChatbotDtos.ChatAction("PROMPT", "❌ Factures refusées", "factures refusées"),
                        new ChatbotDtos.ChatAction("PROMPT", "📂 Dossiers ouverts", "dossiers ouverts")
                )
        );
    }

    private ChatbotDtos.ChatResponse forbidden(String intent) {
        return new ChatbotDtos.ChatResponse(
                "Accès refusé pour cette demande (rôles / permissions insuffisants).",
                intent,
                List.of(),
                List.of()
        );
    }

    private Query extractQuery(String message) {
        Query fromAi = extractQueryFromAi(message);
        if (fromAi != null) return fromAi;
        return extractQueryFromRules(message);
    }

    private Query extractQueryFromRules(String message) {
        String m = normalize(message);

        if (containsAny(m, "aide", "help", "que peux-tu", "comment")) {
            return new Query(Intent.HELP, StatusFilter.ANY, Scope.MY, false, null, null);
        }

        if (containsAny(m, "alerte", "alertes", "notification", "notifications", "échéance", "echeance")) {
            return new Query(Intent.ALERTES, StatusFilter.ANY, Scope.MY, false, null, null);
        }

        if (containsAny(m, "audience", "audiencier")) {
            Integer days = inferDaysWindow(m);
            return new Query(Intent.AUDIENCES, StatusFilter.ANY, Scope.MY, false, null, days);
        }

        if (containsAny(m, "affaire", "affaires", "judiciaire", "procédure", "procedure")) {
            return new Query(Intent.AFFAIRES, StatusFilter.ANY, Scope.MY, false, null, null);
        }

        if (containsAny(m, "facture", "factures")) {
            FactureStatus fs = null;
            if (containsAny(m, "payee", "payée", "payees", "payées")) fs = FactureStatus.PAYEE;
            else if (containsAny(m, "refusee", "refusée", "refusees", "refusées", "refuse", "refus")) fs = FactureStatus.REFUSEE;
            else if (containsAny(m, "en attente", "attente")) fs = FactureStatus.EN_ATTENTE;
            else if (containsAny(m, "validee", "validée", "validees", "validées")) fs = FactureStatus.VALIDEE;
            else if (containsAny(m, "en cours")) fs = FactureStatus.EN_COURS;
            Scope scope = containsAny(m, "toutes", "tous") ? Scope.ALL : Scope.MY;
            return new Query(Intent.FACTURES, StatusFilter.ANY, scope, false, fs, null);
        }

        if (containsAny(m, "mission", "missions")) {
            boolean overdue = containsAny(m, "retard", "en retard", "overdue");
            StatusFilter status = StatusFilter.ANY;
            if (containsAny(m, "en cours")) status = StatusFilter.OPEN;
            else if (containsAny(m, "terminee", "terminée", "terminees", "terminées")) status = StatusFilter.CLOSED;
            Scope scope = containsAny(m, "toutes", "tous") ? Scope.ALL : Scope.MY;
            return new Query(Intent.MISSIONS, status, scope, overdue, null, null);
        }

        if (containsAny(m, "dossier", "dossiers", "contentieux")) {
            boolean overdue = containsAny(m, "retard", "en retard", "overdue");
            StatusFilter status = StatusFilter.ANY;
            if (containsAny(m, "ferme", "fermé", "fermée", "fermes", "fermés", "fermées", "cloture", "clôture", "clotures", "clôturés", "cloturés", "clôturées", "cloturées")) status = StatusFilter.CLOSED;
            else if (containsAny(m, "a valider", "à valider", "validation")) status = StatusFilter.TO_VALIDATE;
            else if (containsAny(m, "ouvert", "ouverts", "en cours")) status = StatusFilter.OPEN;
            Scope scope = containsAny(m, "tous", "toutes") ? Scope.ALL : Scope.MY;
            return new Query(Intent.DOSSIERS, status, scope, overdue, null, null);
        }

        return new Query(Intent.UNKNOWN, StatusFilter.ANY, Scope.MY, false, null, null);
    }

    @Nullable
    private Query extractQueryFromAi(String message) {
        if (!aiEnabled) return null;
        if (aiApiKey == null || aiApiKey.isBlank()) return null;

        try {
            String prompt = """
                    Tu es un extracteur d’intentions pour une application de gestion de contentieux bancaire.
                    Retourne UNIQUEMENT un JSON compact avec les champs:
                    intent: one of [DOSSIERS,MISSIONS,FACTURES,AUDIENCES,AFFAIRES,ALERTES,HELP,UNKNOWN]
                    status: one of [ANY,OPEN,CLOSED,TO_VALIDATE]
                    scope: one of [MY,ALL]
                    overdue: boolean
                    factureStatus: one of [EN_COURS,VALIDEE,PAYEE,null]
                    daysWindow: integer|null
                    """;

            ObjectNodeBuilder body = new ObjectNodeBuilder(objectMapper);
            body.put("model", aiModel);
            body.put("temperature", 0);
            body.putArray("messages")
                    .addObject().put("role", "system").put("content", prompt).end()
                    .addObject().put("role", "user").put("content", message).end()
                    .end();

            RestTemplate rest = restTemplate(aiTimeoutMs);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(aiApiKey);

            String url = aiBaseUrl.endsWith("/") ? aiBaseUrl.substring(0, aiBaseUrl.length() - 1) : aiBaseUrl;
            ResponseEntity<String> resp = rest.exchange(url + "/v1/chat/completions", HttpMethod.POST, new HttpEntity<>(body.buildString(), headers), String.class);

            if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) return null;
            JsonNode root = objectMapper.readTree(resp.getBody());
            String content = root.at("/choices/0/message/content").asText(null);
            if (content == null || content.isBlank()) return null;

            JsonNode out = objectMapper.readTree(content.trim());
            Intent intent = parseIntent(out.path("intent").asText(null));
            StatusFilter status = parseStatusFilter(out.path("status").asText(null));
            Scope scope = parseScope(out.path("scope").asText(null));
            boolean overdue = out.path("overdue").asBoolean(false);
            FactureStatus fs = parseFactureStatus(out.path("factureStatus").isNull() ? null : out.path("factureStatus").asText(null));
            Integer daysWindow = out.path("daysWindow").isNumber() ? out.path("daysWindow").asInt() : null;

            return new Query(intent, status, scope, overdue, fs, daysWindow);
        } catch (Exception ignored) {
            return null;
        }
    }

    private RestTemplate restTemplate(int timeoutMs) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(timeoutMs);
        f.setReadTimeout(timeoutMs);
        return new RestTemplate(f);
    }

    private int inferDaysWindow(String normalizedMessage) {
        if (containsAny(normalizedMessage, "aujourd", "today")) return 1;
        if (containsAny(normalizedMessage, "demain", "tomorrow")) return 1;
        if (containsAny(normalizedMessage, "semaine")) return 7;
        if (containsAny(normalizedMessage, "mois")) return 30;
        return 7;
    }

    private boolean canReadMyMissions(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "MISSION_READ".equals(v)
                    || "ROLE_AVOCAT".equals(v) || "ROLE_HUISSIER".equals(v) || "ROLE_EXPERT".equals(v)
                    || "AVOCAT".equals(v) || "HUISSIER".equals(v) || "EXPERT".equals(v)
                    || "ROLE_PRESTATAIRE".equals(v) || "PRESTATAIRE".equals(v)
                    || "ROLE_ADMIN".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v);
        });
    }

    private boolean canReadJudiciaire(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_ADMIN".equals(v) || "ROLE_CTX_AGENT".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v) || "ROLE_AVOCAT".equals(v)
                    || "ADMIN".equals(v) || "CTX_AGENT".equals(v) || "CHARGE_DOSSIER".equals(v) || "RESPONSABLE_CONTENTIEUX".equals(v) || "AVOCAT".equals(v);
        });
    }

    private boolean canReadFactures(Authentication authentication) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> {
            String v = a.getAuthority();
            return "ROLE_ADMIN".equals(v) || "ROLE_CHARGE_DOSSIER".equals(v) || "ROLE_RESPONSABLE_CONTENTIEUX".equals(v)
                    || "ROLE_PRESTATAIRE".equals(v) || "ROLE_AVOCAT".equals(v) || "ROLE_HUISSIER".equals(v) || "ROLE_EXPERT".equals(v)
                    || "ADMIN".equals(v) || "CHARGE_DOSSIER".equals(v) || "RESPONSABLE_CONTENTIEUX".equals(v)
                    || "PRESTATAIRE".equals(v) || "AVOCAT".equals(v) || "HUISSIER".equals(v) || "EXPERT".equals(v);
        });
    }

    private boolean hasAuthority(Authentication authentication, String authority) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> authority.equals(a.getAuthority()));
    }

    private boolean hasAnyRole(Authentication authentication, String... roles) {
        if (authentication == null || authentication.getAuthorities() == null) return false;
        Set<String> set = new HashSet<>();
        authentication.getAuthorities().forEach(a -> set.add(a.getAuthority()));
        for (String r : roles) {
            if (set.contains(r)) return true;
        }
        return false;
    }

    private boolean isChargeDossier(Authentication authentication) {
        return hasAnyRole(authentication, "ROLE_CHARGE_DOSSIER");
    }

    private boolean isInternal(Authentication authentication) {
        return hasAnyRole(authentication, "ROLE_ADMIN", "ROLE_CHARGE_DOSSIER", "ROLE_RESPONSABLE_CONTENTIEUX", "ADMIN", "CHARGE_DOSSIER", "RESPONSABLE_CONTENTIEUX");
    }

    private UserEntity requireCurrentUser(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        return userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    private Long resolvePrestataireId(Authentication authentication) {
        String username = authentication != null ? authentication.getName() : null;
        if (username == null || username.isBlank()) throw new RuntimeException("Utilisateur non trouvé");
        String email = userRepository.findByUsername(username)
                .map(u -> u.getEmail() != null && !u.getEmail().isBlank() ? u.getEmail() : username)
                .orElse(username);
        PrestataireEntity p = prestataireRepository.findFirstByEmailIgnoreCase(email)
                .orElseThrow(() -> new RuntimeException("Prestataire lié au compte introuvable (vérifiez l'email du profil et du prestataire)"));
        return p.getId();
    }

    private String resolveUserLabel(UserEntity user) {
        if (user == null) return "—";
        String fullName = user.getFullName();
        if (fullName != null && !fullName.isBlank()) return fullName;
        return user.getUsername();
    }

    private String normalize(String v) {
        if (v == null) return "";
        String s = v.toLowerCase(Locale.ROOT).trim();
        s = s.replace("’", "'").replace("é", "e").replace("è", "e").replace("ê", "e").replace("à", "a").replace("ç", "c").replace("î", "i").replace("ï", "i").replace("ô", "o").replace("ù", "u");
        return s;
    }

    private boolean containsAny(String normalizedHaystack, String... needles) {
        if (normalizedHaystack == null) return false;
        for (String n : needles) {
            if (n == null || n.isBlank()) continue;
            if (normalizedHaystack.contains(normalize(n))) return true;
        }
        return false;
    }

    private String safe(String v) {
        return v != null ? v : "—";
    }

    private String nonBlankOrNull(String v) {
        if (v == null) return null;
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private String money(Double amount) {
        if (amount == null) return "—";
        return String.format(Locale.FRANCE, "%.2f", amount);
    }

    private String missionCode(MissionEntity m) {
        if (m == null) return "—";
        String c = m.getCodeMission();
        if (c != null && !c.isBlank()) return c;
        Long id = m.getId();
        int year = (m.getCreatedAt() != null ? m.getCreatedAt().getYear() : LocalDateTime.now().getYear());
        String suffix = id != null ? String.format("%04d", id) : "0000";
        return "MIS-" + year + "-" + suffix;
    }

    private String safeMessage(String message) {
        if (message == null || message.isBlank()) return "Erreur interne";
        return message.length() > 200 ? message.substring(0, 200) : message;
    }

    private Intent parseIntent(String v) {
        if (v == null) return Intent.UNKNOWN;
        try {
            return Intent.valueOf(v.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            return Intent.UNKNOWN;
        }
    }

    private StatusFilter parseStatusFilter(String v) {
        if (v == null) return StatusFilter.ANY;
        try {
            return StatusFilter.valueOf(v.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            return StatusFilter.ANY;
        }
    }

    private Scope parseScope(String v) {
        if (v == null) return Scope.MY;
        try {
            return Scope.valueOf(v.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            return Scope.MY;
        }
    }

    private FactureStatus parseFactureStatus(String v) {
        if (v == null || v.isBlank() || "null".equalsIgnoreCase(v)) return null;
        try {
            return FactureStatus.valueOf(v.trim().toUpperCase(Locale.ROOT));
        } catch (Exception e) {
            return null;
        }
    }

    private enum Intent { DOSSIERS, MISSIONS, FACTURES, AUDIENCES, AFFAIRES, ALERTES, HELP, UNKNOWN }
    private enum StatusFilter { ANY, OPEN, CLOSED, TO_VALIDATE }
    private enum Scope { MY, ALL }

    private record Query(
            Intent intent,
            StatusFilter statusFilter,
            Scope scope,
            boolean overdue,
            FactureStatus factureStatus,
            Integer daysWindow
    ) {}

    private static final class ObjectNodeBuilder {
        private final ObjectMapper mapper;
        private final com.fasterxml.jackson.databind.node.ObjectNode root;
        private com.fasterxml.jackson.databind.node.ArrayNode currentArray;
        private com.fasterxml.jackson.databind.node.ObjectNode currentObject;

        ObjectNodeBuilder(ObjectMapper mapper) {
            this.mapper = mapper;
            this.root = mapper.createObjectNode();
            this.currentObject = root;
        }

        ObjectNodeBuilder put(String key, String value) {
            currentObject.put(key, value);
            return this;
        }

        ObjectNodeBuilder put(String key, int value) {
            currentObject.put(key, value);
            return this;
        }

        ObjectNodeBuilder put(String key, boolean value) {
            currentObject.put(key, value);
            return this;
        }

        ArrayBuilder putArray(String key) {
            this.currentArray = currentObject.putArray(key);
            return new ArrayBuilder(this);
        }

        String buildString() {
            try {
                return mapper.writeValueAsString(root);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }

        private static final class ArrayBuilder {
            private final ObjectNodeBuilder parent;

            ArrayBuilder(ObjectNodeBuilder parent) {
                this.parent = parent;
            }

            ObjectBuilder addObject() {
                com.fasterxml.jackson.databind.node.ObjectNode o = parent.mapper.createObjectNode();
                parent.currentArray.add(o);
                return new ObjectBuilder(parent, o);
            }

            ObjectNodeBuilder end() {
                parent.currentArray = null;
                return parent;
            }
        }

        private static final class ObjectBuilder {
            private final ObjectNodeBuilder parent;
            private final com.fasterxml.jackson.databind.node.ObjectNode obj;

            ObjectBuilder(ObjectNodeBuilder parent, com.fasterxml.jackson.databind.node.ObjectNode obj) {
                this.parent = parent;
                this.obj = obj;
            }

            ObjectBuilder put(String key, String value) {
                obj.put(key, value);
                return this;
            }

            ArrayBuilder putArray(String key) {
                parent.currentArray = obj.putArray(key);
                return new ArrayBuilder(parent);
            }

            ArrayBuilder end() {
                return new ArrayBuilder(parent);
            }
        }
    }
}
