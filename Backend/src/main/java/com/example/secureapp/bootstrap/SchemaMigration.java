package com.example.secureapp.bootstrap;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import javax.sql.DataSource;
import java.sql.Connection;
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
            }
        };
    }
}
