package com.example.secureapp.bootstrap;

import com.example.secureapp.user.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Configuration
public class DataInitializer {
    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Value("${BOOTSTRAP_ADMIN_PASSWORD:Admin@123}")
    private String bootstrapAdminPassword;

    @Value("${BOOTSTRAP_RESET_ADMIN_PASSWORD:false}")
    private boolean bootstrapResetAdminPassword;

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
                    Permission.CONTENTIOUS_REJECT,
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
                    Permission.CONTENTIOUS_READ,
                    Permission.PRESTATAIRE_READ,
                    Permission.MISSION_READ,
                    Permission.MISSION_UPDATE
            )));
            avocatRole = roleRepo.save(avocatRole);

            // 5. HUISSIER - External collaborator
            RoleEntity huissierRole = roleRepo.findByName("HUISSIER").orElseGet(() -> new RoleEntity("HUISSIER"));
            huissierRole.setPermissions(new HashSet<>(Arrays.asList(
                    Permission.PROFILE_READ,
                    Permission.PROFILE_UPDATE,
                    Permission.CONTENTIOUS_READ,
                    Permission.PRESTATAIRE_READ,
                    Permission.MISSION_READ,
                    Permission.MISSION_UPDATE
            )));
            huissierRole = roleRepo.save(huissierRole);

            // 6. EXPERT - External collaborator
            RoleEntity expertRole = roleRepo.findByName("EXPERT").orElseGet(() -> new RoleEntity("EXPERT"));
            expertRole.setPermissions(new HashSet<>(Arrays.asList(
                    Permission.PROFILE_READ,
                    Permission.PROFILE_UPDATE,
                    Permission.CONTENTIOUS_READ,
                    Permission.PRESTATAIRE_READ,
                    Permission.MISSION_READ,
                    Permission.MISSION_UPDATE
            )));
            expertRole = roleRepo.save(expertRole);

            if (repo.findByUsername("admin").isPresent()) {
                UserEntity existingAdmin = repo.findByUsername("admin").get();
                existingAdmin.setRole(adminRole);
                existingAdmin.setEnabled(true);
                if (bootstrapResetAdminPassword) {
                    existingAdmin.setPassword(encoder.encode(bootstrapAdminPassword));
                    log.info("bootstrap.user reset password for username=admin");
                }
                repo.save(existingAdmin);
                log.info("bootstrap.user ensured username=admin role=ADMIN enabled=true");
            } else {
                UserEntity admin = new UserEntity();
                admin.setUsername("admin");
                admin.setPassword(encoder.encode(bootstrapAdminPassword));
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

    @Bean
    @Order(20)
    ApplicationRunner ensureContentieuxSchema(DataSource dataSource) {
        return args -> {
            ensureStatutColumnIsVarchar(dataSource);
            ensureColumn(dataSource, "dossiers_contentieux", "motif_rejet", "LONGTEXT");
            ensureColumn(dataSource, "dossiers_contentieux", "rejected_by", "VARCHAR(150)");
            ensureColumn(dataSource, "dossiers_contentieux", "rejected_at", "DATETIME(6)");
            
            ensureFacturePrestationsTable(dataSource);
            ensureColumn(dataSource, "factures", "prestataire_id", "BIGINT");
            ensureColumn(dataSource, "factures", "note_honoraire_id", "BIGINT");
            ensureColumn(dataSource, "factures", "remarques", "TEXT");
            ensureColumn(dataSource, "factures", "conditions_paiement", "TEXT");
            ensureColumn(dataSource, "factures", "mode_paiement", "VARCHAR(255)");
            ensureColumn(dataSource, "factures", "type_lien", "VARCHAR(50)");
            ensureColumn(dataSource, "factures", "reference_lien", "VARCHAR(255)");
            ensureColumn(dataSource, "factures", "fichier_justificatif", "VARCHAR(255)");
            ensureColumn(dataSource, "factures", "montant_paye", "DOUBLE DEFAULT 0.0");
            ensureColumn(dataSource, "factures", "reste_apayer", "DOUBLE DEFAULT 0.0");
            ensureColumn(dataSource, "factures", "created_at", "DATETIME(6)");
            ensureColumn(dataSource, "factures", "updated_at", "DATETIME(6)");
        };
    }

    private void ensureStatutColumnIsVarchar(DataSource dataSource) {
        String table = "dossiers_contentieux";
        String column = "statut";
        try (Connection c = dataSource.getConnection();
             Statement st = c.createStatement()) {
            String dataType = null;
            try (ResultSet rs = st.executeQuery(
                    "SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='" + table + "' AND COLUMN_NAME='" + column + "'"
            )) {
                if (rs.next()) {
                    dataType = rs.getString(1);
                }
            }
            if (dataType != null && "enum".equalsIgnoreCase(dataType)) {
                st.executeUpdate("ALTER TABLE " + table + " MODIFY COLUMN " + column + " VARCHAR(40) NOT NULL");
                log.info("bootstrap.schema modified_column table={} column={} type=VARCHAR(40)", table, column);
            }
        } catch (Exception ex) {
            log.warn("bootstrap.schema ensure_statut_type_failed error={}", ex.getMessage());
        }
    }

    private void ensureColumn(DataSource dataSource, String table, String column, String ddlType) {
        try (Connection c = dataSource.getConnection();
             Statement st = c.createStatement()) {
            boolean exists = false;
            try (ResultSet rs = st.executeQuery(
                    "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='" + table + "' AND COLUMN_NAME='" + column + "'"
            )) {
                if (rs.next()) {
                    exists = rs.getInt(1) > 0;
                }
            }
            if (!exists) {
                st.executeUpdate("ALTER TABLE " + table + " ADD COLUMN " + column + " " + ddlType);
                log.info("bootstrap.schema added_column table={} column={}", table, column);
            }
        } catch (Exception ex) {
            log.warn("bootstrap.schema ensure_column_failed table={} column={} error={}", table, column, ex.getMessage());
        }
    }

    private void ensureFacturePrestationsTable(DataSource dataSource) {
        try (Connection c = dataSource.getConnection();
             Statement st = c.createStatement()) {
            st.executeUpdate(
                    "CREATE TABLE IF NOT EXISTS facture_prestations (" +
                            "id BIGINT NOT NULL AUTO_INCREMENT," +
                            "type VARCHAR(255) NOT NULL," +
                            "description TEXT," +
                            "quantite INT DEFAULT 1," +
                            "prix_unitaire DECIMAL(12,3) NOT NULL," +
                            "montant DECIMAL(12,3) NOT NULL," +
                            "facture_id BIGINT NOT NULL," +
                            "PRIMARY KEY (id)" +
                            ")"
            );
            try {
                st.executeUpdate("CREATE INDEX idx_facture_prestations_facture_id ON facture_prestations (facture_id)");
            } catch (Exception ignored) {
            }
        } catch (Exception ex) {
            log.warn("bootstrap.schema ensure_table_failed table={} error={}", "facture_prestations", ex.getMessage());
        }
    }
}
