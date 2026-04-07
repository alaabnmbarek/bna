package com.example.secureapp.mail;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private final JavaMailSender mailSender;
    
    @Value("${spring.mail.username}")
    private String from;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordChangeNotification(String to, String fullName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Confirmation de changement de mot de passe");
        message.setText("Bonjour " + fullName + ",\n\n" +
                "Nous vous confirmons que le mot de passe de votre compte sur l'application BNA Contentieux a été modifié avec succès.\n\n" +
                "Si vous n'êtes pas à l'origine de cette action, veuillez contacter immédiatement l'administrateur.\n\n" +
                "Ceci est un message automatique, merci de ne pas y répondre.");
        
        try {
            mailSender.send(message);
        } catch (Exception e) {
            // Log the error but don't fail the password change
            System.err.println("Erreur lors de l'envoi de l'email : " + e.getMessage());
        }
    }

    public void sendAdminApprovalRequest(String adminEmail, String userFullName, String confirmLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
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
            System.err.println("Erreur lors de l'envoi de l'email à l'admin : " + e.getMessage());
        }
    }
}
