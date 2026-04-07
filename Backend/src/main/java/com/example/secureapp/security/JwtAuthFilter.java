package com.example.secureapp.security;

import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(JwtAuthFilter.class);
    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsService;

    public JwtAuthFilter(JwtService jwtService, UserDetailsServiceImpl userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        final String authHeader = request.getHeader("Authorization");
        final String requestURI = request.getRequestURI();
        
        log.info("Request: {} {}, AuthHeader: {}", request.getMethod(), requestURI, authHeader != null ? "PRESENT" : "MISSING");
        
        // Don't validate JWT for public endpoints to avoid 401 on expired tokens
        if (requestURI.equals("/api/auth/login") || 
            requestURI.equals("/api/auth/register") || 
            requestURI.equals("/api/auth/refresh") ||
            requestURI.equals("/api/auth/reset-password") ||
            requestURI.equals("/api/auth/confirm-password-change")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt;
        final String username;
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        jwt = authHeader.substring(7);
        try {
            username = jwtService.extractUsername(jwt);
            log.info("Extracted username: {} from token: {}...", username, jwt.substring(0, Math.min(10, jwt.length())));
        } catch (ExpiredJwtException ex) {
            log.warn("Expired token for request {} {}", request.getMethod(), requestURI);
            // Only return 401 if it's not an auth request (already covered by if above, but double safety)
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        } catch (Exception e) {
            log.warn("Invalid token: {}", e.getMessage());
            filterChain.doFilter(request, response);
            return;
        }
        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            boolean isValid = jwtService.isTokenValid(jwt, userDetails);
            log.info("Token validation result: {} for user: {}", isValid, username);
            if (isValid) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
                log.info("Authenticated user: {}, authorities: {}", username, userDetails.getAuthorities());
            }
        }
        filterChain.doFilter(request, response);
    }
}
