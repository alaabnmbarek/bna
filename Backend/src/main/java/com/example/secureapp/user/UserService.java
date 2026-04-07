package com.example.secureapp.user;

import com.example.secureapp.token.RefreshTokenRepository;
import com.example.secureapp.user.dto.UserDto;
import com.example.secureapp.user.RoleEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, RefreshTokenRepository refreshTokenRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public UserDto getUserById(Long id) {
        return userRepository.findById(id)
                .map(this::mapToDto)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    public UserDto getProfile(String username) {
        return userRepository.findByUsername(username)
                .map(this::mapToDto)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    @Transactional
    public UserDto createUser(UserEntity user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new RuntimeException("Nom d'utilisateur déjà pris");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        return mapToDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, UserDto userDetails) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        user.setFullName(userDetails.getFullName());
        user.setEmail(userDetails.getEmail());
        user.setPhoneNumber(userDetails.getPhoneNumber());
        
        if (userDetails.getRole() != null) {
            RoleEntity role = roleRepository.findByName(userDetails.getRole())
                    .orElseThrow(() -> new RuntimeException("Rôle non trouvé : " + userDetails.getRole()));
            user.setRole(role);
        }
        
        user.setEnabled(userDetails.isEnabled());
        user.setPermissions(new HashSet<>());
        
        if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }

        return mapToDto(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        refreshTokenRepository.deleteByUser(user);
        userRepository.delete(user);
    }

    @Transactional
    public void toggleUserStatus(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        user.setEnabled(!user.isEnabled());
        userRepository.save(user);
    }

    @Transactional
    public UserDto updateProfile(String username, UserDto profileData) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier si l'email est déjà utilisé par un autre utilisateur
        userRepository.findByEmail(profileData.getEmail()).ifPresent(existingUser -> {
            if (!existingUser.getId().equals(user.getId())) {
                throw new RuntimeException("Cet email est déjà utilisé par un autre compte");
            }
        });

        user.setFullName(profileData.getFullName());
        user.setEmail(profileData.getEmail());
        user.setProfileImage(profileData.getProfileImage());

        return mapToDto(userRepository.save(user));
    }

    private UserDto mapToDto(UserEntity user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setPhoneNumber(user.getPhoneNumber());
        if (user.getRole() != null) {
            dto.setRole(user.getRole().getName());
        }
        Set<Permission> effective = new HashSet<>();
        if (user.getRole() != null && user.getRole().getPermissions() != null) {
            effective.addAll(user.getRole().getPermissions());
        }
        if (user.getPermissions() != null) {
            effective.addAll(user.getPermissions());
        }
        dto.setPermissions(effective);
        dto.setEnabled(user.isEnabled());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setProfileImage(user.getProfileImage());
        return dto;
    }
}
