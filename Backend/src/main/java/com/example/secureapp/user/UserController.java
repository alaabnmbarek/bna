package com.example.secureapp.user;

import com.example.secureapp.user.dto.UserDto;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class UserController {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(UserController.class);
    private final UserService userService;
    private final RoleService roleService;

    public UserController(UserService userService, RoleService roleService) {
        this.userService = userService;
        this.roleService = roleService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('USER_READ')")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_READ')")
    public ResponseEntity<UserDto> getUserById(@PathVariable("id") Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public ResponseEntity<?> createUser(@RequestBody UserDto userDto) {
        log.info("admin.create_user username={} role={}", userDto.getUsername(), userDto.getRole());
        try {
            UserEntity user = new UserEntity();
            user.setUsername(userDto.getUsername());
            user.setPassword(userDto.getPassword()); // Le service s'occupera du hachage
            user.setEmail(userDto.getEmail());
            user.setFullName(userDto.getFullName());
            user.setPhoneNumber(userDto.getPhoneNumber());
            
            if (userDto.getRole() != null) {
                user.setRole(roleService.getRoleByName(userDto.getRole()));
            }

            user.setPermissions(java.util.Set.of());
            user.setEnabled(true);
            return ResponseEntity.ok(userService.createUser(user));
        } catch (Exception e) {
            log.error("admin.create_user ERROR username={}", userDto.getUsername(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    public ResponseEntity<UserDto> updateUser(@PathVariable("id") Long id, @RequestBody UserDto user) {
        return ResponseEntity.ok(userService.updateUser(id, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('USER_DELETE')")
    public ResponseEntity<Void> deleteUser(@PathVariable("id") Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('USER_UPDATE')")
    public ResponseEntity<Void> toggleUserStatus(@PathVariable("id") Long id) {
        userService.toggleUserStatus(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Permission[]> getAllPermissions() {
        return ResponseEntity.ok(Permission.values());
    }
}
