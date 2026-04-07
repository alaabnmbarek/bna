package com.example.secureapp.token;

import com.example.secureapp.user.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUser(UserEntity user);
    
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    int deleteByUser(UserEntity user);
}
