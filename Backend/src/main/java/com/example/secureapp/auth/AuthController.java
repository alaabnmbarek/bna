package com.example.secureapp.auth;

import com.example.secureapp.auth.dto.AuthRequest;
import com.example.secureapp.auth.dto.AuthResponse;
import com.example.secureapp.auth.dto.ChangePasswordRequest;
import com.example.secureapp.mail.EmailService;
import com.example.secureapp.security.JwtService;
import com.example.secureapp.token.RefreshToken;
import com.example.secureapp.token.RefreshTokenService;
import com.example.secureapp.user.RoleEntity;
import com.example.secureapp.user.RoleRepository;
import com.example.secureapp.user.UserEntity;
import com.example.secureapp.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger log = LoggerFactory.getLogger(AuthController.class);
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenService refreshTokenService;
    private final EmailService emailService;
    private final PasswordChangeRequestRepository passwordChangeRequestRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    @Value("${APP_BASE_URL:http://localhost:8080}")
    private String appBaseUrl;

    @Value("${FRONTEND_BASE_URL:http://localhost:4200}")
    private String frontendBaseUrl;

    public AuthController(AuthenticationManager authenticationManager, JwtService jwtService, UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder, RefreshTokenService refreshTokenService, EmailService emailService, PasswordChangeRequestRepository passwordChangeRequestRepository, PasswordResetTokenRepository passwordResetTokenRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenService = refreshTokenService;
        this.emailService = emailService;
        this.passwordChangeRequestRepository = passwordChangeRequestRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Validated @RequestBody AuthRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            
            UserEntity user = (UserEntity) userDetails;
            Map<String, Object> claims = new HashMap<>();
            if (user.getRole() != null) {
                claims.put("role", user.getRole().getName());
            }
            claims.put("uid", user.getId());
            claims.put("permissions", user.getPermissions().stream().map(Enum::name).collect(Collectors.toList()));
            
            String token = jwtService.generateToken(userDetails, user.getId(), claims);
            RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());
            
            long expiresIn = jwtService.getExpirationMs();
            log.info("auth.login success username={}", user.getUsername());
            
            List<String> authorities = user.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toList());
            
            return ResponseEntity.ok(new AuthResponse(
                token, 
                refreshToken.getToken(), 
                expiresIn, 
                authorities.get(0) // Still send primary role for backward compatibility
            ));
        } catch (BadCredentialsException ex) {
            log.warn("auth.login failed username={}", request.getUsername());
            return ResponseEntity.status(401).build();
        } catch (Exception ex) {
            log.error("auth.login error username={}", request.getUsername(), ex);
            return ResponseEntity.status(500).build();
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody Map<String, String> request) {
        String requestRefreshToken = request.get("refreshToken");

        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getUser)
                .map(user -> {
                    Map<String, Object> claims = new HashMap<>();
                    if (user.getRole() != null) {
                        claims.put("role", user.getRole().getName());
                    }
                    claims.put("uid", user.getId());
                    claims.put("permissions", user.getPermissions().stream().map(Enum::name).collect(Collectors.toList()));
                    
                    String token = jwtService.generateToken(user, user.getId(), claims);
                    
                    List<String> authorities = user.getAuthorities().stream()
                            .map(GrantedAuthority::getAuthority)
                            .collect(Collectors.toList());
                    
                    return ResponseEntity.ok(new AuthResponse(
                        token, 
                        requestRefreshToken, 
                        jwtService.getExpirationMs(), 
                        authorities.get(0)
                    ));
                })
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Validated @RequestBody AuthRequest request) {
        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().build();
        }
        UserEntity user = new UserEntity();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
        roleRepository.findByName("CHARGE_DOSSIER")
                .ifPresent(user::setRole);
                
        user.setEnabled(true);
        userRepository.save(user);
        log.info("auth.register success username={}", request.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(@Validated @RequestBody ChangePasswordRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UserEntity user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            log.warn("auth.change_password failed username={} reason=invalid_current_password", user.getUsername());
            return ResponseEntity.status(401).build();
        }

        // Créer une demande de changement de mot de passe
        PasswordChangeRequest pwdRequest = new PasswordChangeRequest();
        pwdRequest.setUser(user);
        pwdRequest.setNewPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        pwdRequest.setToken(UUID.randomUUID().toString());
        pwdRequest.setExpiryDate(LocalDateTime.now().plusHours(24));
        passwordChangeRequestRepository.save(pwdRequest);

        // Envoyer l'email à l'administrateur
        userRepository.findAll().stream()
                .filter(u -> u.getRole() != null && "ADMIN".equals(u.getRole().getName()))
                .findFirst()
                .ifPresent(admin -> {
                    String confirmLink = appBaseUrl + "/api/auth/confirm-password-change?token=" + pwdRequest.getToken();
                    emailService.sendAdminApprovalRequest(admin.getEmail(), user.getFullName(), confirmLink);
                });
        
        log.info("auth.change_password_request created username={}", user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Votre demande a été envoyée à l'administrateur pour validation."));
    }

    @GetMapping("/confirm-password-change")
    @Transactional
    public ResponseEntity<String> confirmPasswordChange(@RequestParam("token") String token) {
        PasswordChangeRequest pwdRequest = passwordChangeRequestRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Demande non trouvée ou invalide"));

        if (pwdRequest.isUsed() || pwdRequest.getExpiryDate().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(400).body("Le lien est expiré ou a déjà été utilisé.");
        }

        UserEntity user = pwdRequest.getUser();
        user.setPassword(pwdRequest.getNewPasswordHash());
        userRepository.save(user);

        pwdRequest.setUsed(true);
        passwordChangeRequestRepository.save(pwdRequest);

        // Informer l'utilisateur par mail
        if (user.getEmail() != null) {
            emailService.sendPasswordChangeNotification(user.getEmail(), user.getFullName());
        }

        return ResponseEntity.ok("Le mot de passe de " + user.getFullName() + " a été mis à jour avec succès.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim();
        log.info("auth.reset_password email={}", email);

        if (!email.isBlank()) {
            userRepository.findByEmail(email).ifPresent(user -> {
                if (user.getEmail() == null || user.getEmail().isBlank()) return;
                PasswordResetToken token = new PasswordResetToken();
                token.setUser(user);
                token.setToken(UUID.randomUUID().toString());
                token.setExpiryDate(LocalDateTime.now().plusMinutes(30));
                passwordResetTokenRepository.save(token);

                String link = frontendBaseUrl + "/reset-password/confirm?token=" + token.getToken();
                emailService.sendPasswordResetLink(user.getEmail(), user.getFullName(), link);
            });
        }

        return ResponseEntity.ok(Map.of("message", "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé."));
    }

    public record ResetPasswordConfirmRequest(String token, String newPassword) {}

    @PostMapping("/reset-password/confirm")
    @Transactional
    public ResponseEntity<Map<String, String>> confirmResetPassword(@Validated @RequestBody ResetPasswordConfirmRequest request) {
        PasswordResetToken prt = passwordResetTokenRepository.findByToken(request.token())
                .orElseThrow(() -> new RuntimeException("Token invalide"));

        if (prt.isUsed() || prt.getExpiryDate().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(400).body(Map.of("message", "Le lien est expiré ou a déjà été utilisé."));
        }

        if (request.newPassword() == null || request.newPassword().isBlank()) {
            return ResponseEntity.status(400).body(Map.of("message", "Mot de passe invalide."));
        }

        UserEntity user = prt.getUser();
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        prt.setUsed(true);
        passwordResetTokenRepository.save(prt);

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            emailService.sendPasswordChangeNotification(user.getEmail(), user.getFullName());
        }

        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
    }
}
