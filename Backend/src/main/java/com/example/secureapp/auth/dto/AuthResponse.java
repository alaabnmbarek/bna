package com.example.secureapp.auth.dto;

public class AuthResponse {
    private String token;
    private String refreshToken;
    private long expiresIn;
    private String role;

    public AuthResponse(String token, String refreshToken, long expiresIn, String role) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.expiresIn = expiresIn;
        this.role = role;
    }

    public String getToken() {
        return token;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public long getExpiresIn() {
        return expiresIn;
    }

    public String getRole() {
        return role;
    }
}
