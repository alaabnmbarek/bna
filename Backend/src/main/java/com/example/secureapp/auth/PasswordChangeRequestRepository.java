package com.example.secureapp.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PasswordChangeRequestRepository extends JpaRepository<PasswordChangeRequest, Long> {
    Optional<PasswordChangeRequest> findByToken(String token);
}
