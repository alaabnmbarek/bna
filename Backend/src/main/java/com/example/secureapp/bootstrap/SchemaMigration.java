package com.example.secureapp.bootstrap;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.Statement;

@Configuration
public class SchemaMigration {
    @Bean
    @Order(0)
    ApplicationRunner migrateSchema(DataSource dataSource) {
        return args -> {
            try (Connection c = dataSource.getConnection(); Statement s = c.createStatement()) {
                try {
                    s.execute("ALTER TABLE role_permissions MODIFY COLUMN permission VARCHAR(100)");
                } catch (Exception ignored) {
                }
                try {
                    s.execute("ALTER TABLE user_permissions MODIFY COLUMN permission VARCHAR(100)");
                } catch (Exception ignored) {
                }
                DatabaseMetaData meta = c.getMetaData();
                String product = "";
                try {
                    product = meta.getDatabaseProductName();
                } catch (Exception ignored) {
                }
                String p = product == null ? "" : product.toLowerCase();

                boolean migrated = false;
                Exception last = null;
                String[] candidates;
                if (p.contains("postgres")) {
                    candidates = new String[]{
                            "ALTER TABLE factures ALTER COLUMN statut TYPE VARCHAR(128)",
                            "ALTER TABLE factures ALTER COLUMN statut TYPE VARCHAR(64)"
                    };
                } else if (p.contains("h2")) {
                    candidates = new String[]{
                            "ALTER TABLE factures ALTER COLUMN statut VARCHAR(128)",
                            "ALTER TABLE factures ALTER COLUMN statut VARCHAR(64)"
                    };
                } else {
                    candidates = new String[]{
                            "ALTER TABLE factures MODIFY COLUMN statut VARCHAR(128) NOT NULL",
                            "ALTER TABLE factures MODIFY statut VARCHAR(128) NOT NULL",
                            "ALTER TABLE factures MODIFY COLUMN statut VARCHAR(64) NOT NULL",
                            "ALTER TABLE factures MODIFY statut VARCHAR(64) NOT NULL"
                    };
                }

                try {
                    s.execute("UPDATE factures SET statut='CHEQUE_BCT_EN_COURS' WHERE statut='CHEQUE_BCT_ATTENTE_VALIDATION'");
                } catch (Exception ignored) {
                }

                for (String sql : candidates) {
                    try {
                        s.execute(sql);
                        migrated = true;
                        break;
                    } catch (Exception ex) {
                        last = ex;
                    }
                }

                if (!migrated && last != null) {
                    System.err.println("SchemaMigration: failed to widen factures.statut (" + product + "): " + last.getMessage());
                }
            }
        };
    }
}
