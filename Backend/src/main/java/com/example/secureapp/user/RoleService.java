package com.example.secureapp.user;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Set;

@Service
public class RoleService {
    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    public List<RoleEntity> getAllRoles() {
        return roleRepository.findAll();
    }

    public RoleEntity getRoleById(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rôle non trouvé"));
    }

    public RoleEntity getRoleByName(String name) {
        return roleRepository.findByName(name)
                .orElseThrow(() -> new RuntimeException("Rôle non trouvé : " + name));
    }

    @Transactional
    public RoleEntity createRole(RoleEntity role) {
        if (roleRepository.findByName(role.getName()).isPresent()) {
            throw new RuntimeException("Le nom du rôle existe déjà");
        }
        return roleRepository.save(role);
    }

    @Transactional
    public RoleEntity updateRole(Long id, RoleEntity roleDetails) {
        RoleEntity role = getRoleById(id);
        role.setName(roleDetails.getName());
        role.setPermissions(roleDetails.getPermissions());
        return roleRepository.save(role);
    }

    @Transactional
    public void deleteRole(Long id) {
        RoleEntity role = getRoleById(id);
        // Important: check if role is assigned to users before deleting
        // For simplicity here, we just delete
        roleRepository.delete(role);
    }
}
