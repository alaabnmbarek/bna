package com.example.secureapp.user;

public enum Permission {
    // User management
    USER_READ,
    USER_CREATE,
    USER_UPDATE,
    USER_DELETE,
    
    // Profile management
    PROFILE_READ,
    PROFILE_UPDATE,
    
    // Contentious management
    CONTENTIOUS_READ,
    CONTENTIOUS_CREATE,
    CONTENTIOUS_UPDATE,
    CONTENTIOUS_DELETE,
    CONTENTIOUS_VALIDATE,
    CONTENTIOUS_ASSIGN,
    CONTENTIOUS_CHANGE_ACCOUNT,
    CONTENTIOUS_CLOSE,
    CONTENTIOUS_REJECT,
    CONTENTIOUS_REOPEN,
    
    // System permissions
    SYSTEM_MANAGE_PERMISSIONS,

    // Prestataires management
    PRESTATAIRE_READ,
    PRESTATAIRE_CREATE,
    PRESTATAIRE_UPDATE,
    PRESTATAIRE_DELETE,

    // Missions management
    MISSION_READ,
    MISSION_CREATE,
    MISSION_UPDATE
}
