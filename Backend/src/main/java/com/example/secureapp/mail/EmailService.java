package com.example.secureapp.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.username:}")
    private String springMailUsername;

    @Value("${MAIL_FROM:}")
    private String configuredFrom;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordChangeNotification(String to, String fullName) {
        SimpleMailMessage message = new SimpleMailMessage();
        String from = resolveFrom();
        if (from != null) message.setFrom(from);
        message.setTo(to);
        message.setSubject("Confirmation de changement de mot de passe");
        message.setText("Bonjour " + fullName + ",\n\n" +
                "Nous vous confirmons que le mot de passe de votre compte sur l'application BNA Contentieux a été modifié avec succès.\n\n" +
                "Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement l'administrateur.\n\n" +
                "Ceci est un message automatique, merci de ne pas y répondre.");
        
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Erreur lors de l'envoi de l'email de confirmation de changement de mot de passe to={}", to, e);
        }
    }

    public void sendAdminApprovalRequest(String adminEmail, String userFullName, String confirmLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        String from = resolveFrom();
        if (from != null) message.setFrom(from);
        message.setTo(adminEmail);
        message.setSubject("Demande de changement de mot de passe - " + userFullName);
        message.setText("Bonjour Administrateur,\n\n" +
                "L'utilisateur " + userFullName + " a demandé à changer son mot de passe.\n\n" +
                "Pour valider cette demande, veuillez cliquer sur le lien suivant :\n" +
                confirmLink + "\n\n" +
                "Si vous ne validez pas cette demande, l'ancien mot de passe restera actif.\n\n" +
                "Ceci est un message automatique.");
        
        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Erreur lors de l'envoi de l'email à l'admin to={}", adminEmail, e);
        }
    }

    public void sendPasswordResetLink(String to, String fullName, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        String from = resolveFrom();
        if (from != null) message.setFrom(from);
        message.setTo(to);
        message.setSubject("Réinitialisation de mot de passe - BNA Contentieux");
        message.setText("Bonjour " + (fullName == null || fullName.isBlank() ? "" : fullName) + ",\n\n" +
                "Vous avez demandé à réinitialiser votre mot de passe.\n\n" +
                "Cliquez sur le lien suivant pour définir un nouveau mot de passe :\n" +
                resetLink + "\n\n" +
                "Ce lien expire dans 30 minutes.\n\n" +
                "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n" +
                "Ceci est un message automatique, merci de ne pas y répondre.");

        try {
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Erreur lors de l'envoi de l'email de réinitialisation to={}", to, e);
        }
    }

    private String resolveFrom() {
        if (configuredFrom != null && !configuredFrom.isBlank()) return configuredFrom;
        if (springMailUsername != null && !springMailUsername.isBlank()) return springMailUsername;
        return null;
    }
}
