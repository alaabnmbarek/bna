package com.example.secureapp.bootstrap;

import com.example.secureapp.user.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Configuration
public class DataInitializer {
    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    @Order(10)
    ApplicationRunner initUsers(UserRepository repo, RoleRepository roleRepo, PasswordEncoder encoder) {
        return args -> {
            // 1. ADMIN - Full access
            RoleEntity adminRole = roleRepo.findByName("ADMIN").orElseGet(() -> new RoleEntity("ADMIN"));
            adminRole.setPermissions(new HashSet<>(Arrays.asList(Permission.values())));
            adminRole = roleRepo.save(adminRole);

            // 2. CHARGE_DOSSIER - Main user
            RoleEntity userRole = roleRepo.findByName("CHARGE_DOSSIER").orElseGet(() -> new RoleEntity("CHARGE_DOSSIER"));
            userRole.setPermissions(new HashSet<>(Arrays.asList(
                    Permission.PROFILE_READ,
                    Permission.PROFILE_UPDATE,
                    Permission.CONTENTIOUS_READ,
                    Permission.CONTENTIOUS_CREATE,
                    Permission.CONTENTIOUS_UPDATE,
                    Permission.PRESTATAIRE_READ,
                    Permission.MISSION_READ,
                    Permission.MISSION_CREATE,
                    Permission.MISSION_UPDATE
            )));
            userRole = roleRepo.save(userRole);

            // 3. RESPONSABLE_CONTENTIEUX - Validation power
            RoleEntity respRole = roleRepo.findByName("RESPONSABLE_CONTENTIEUX").orElseGet(() -> new RoleEntity("RESPONSABLE_CONTENTIEUX"));
            respRole.setPermissions(new HashSet<>(Arrays.asList(
                    Permission.PROFILE_READ,
                    Permission.PROFILE_UPDATE,
                    Permission.CONTENTIOUS_READ,
                    Permission.CONTENTIOUS_CREATE,
                    Permission.CONTENTIOUS_UPDATE,
                    Permission.CONTENTIOUS_DELETE,
                    Permission.CONTENTIOUS_VALIDATE,
                    Permission.CONTENTIOUS_ASSIGN,
                    Permission.CONTENTIOUS_CHANGE_ACCOUNT,
                    Permission.CONTENTIOUS_CLOSE,
                    Permission.CONTENTIOUS_REOPEN,
                    Permission.PRESTATAIRE_READ,
                    Permission.PRESTATAIRE_CREATE,
                    Permission.PRESTATAIRE_UPDATE,
                    Permission.MISSION_READ,
                    Permission.MISSION_CREATE,
                    Permission.MISSION_UPDATE
            )));
            respRole = roleRepo.save(respRole);

            // 4. AVOCAT - External collaborator
            RoleEntity avocatRole = roleRepo.findByName("AVOCAT").orElseGet(() -> new RoleEntity("AVOCAT"));
            avocatRole.setPermissions(new HashSet<>(Arrays.asList(
                    Permission.PROFILE_READ,
                    Permission.PROFILE_UPDATE,
                    Permission.CONTENTIOUS_READ
            )));
            avocatRole = roleRepo.save(avocatRole);

            // 5. HUISSIER - External collaborator
            RoleEntity huissierRole = roleRepo.findByName("HUISSIER").orElseGet(() -> new RoleEntity("HUISSIER"));
            huissierRole.setPermissions(new HashSet<>(Arrays.asList(
                    Permission.PROFILE_READ,
                    Permission.PROFILE_UPDATE,
                    Permission.CONTENTIOUS_READ
            )));
            huissierRole = roleRepo.save(huissierRole);

            if (repo.findByUsername("admin").isPresent()) {
                UserEntity existingAdmin = repo.findByUsername("admin").get();
                existingAdmin.setPassword(encoder.encode("Admin@123"));
                existingAdmin.setRole(adminRole);
                existingAdmin.setEnabled(true);
                repo.save(existingAdmin);
                log.info("bootstrap.user updated password for username=admin");
            } else {
                UserEntity admin = new UserEntity();
                admin.setUsername("admin");
                admin.setPassword(encoder.encode("Admin@123"));
                admin.setEmail("admin@bna.tn");
                admin.setFullName("Administrateur Système");
                admin.setRole(adminRole);
                admin.setEnabled(true);
                repo.save(admin);
                log.info("bootstrap.user created username=admin role=ADMIN");
            }
            if (repo.findByUsername("user").isEmpty()) {
                UserEntity user = new UserEntity();
                user.setUsername("user");
                user.setPassword(encoder.encode("User@123"));
                user.setEmail("user@bna.tn");
                user.setFullName("Chargé de Dossier Demo");
                user.setRole(userRole);
                user.setEnabled(true);
                repo.save(user);
                log.info("bootstrap.user created username=user role=CHARGE_DOSSIER");
            }
        };
    }
}
