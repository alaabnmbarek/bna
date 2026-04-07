package com.example.secureapp.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TestController {
    @GetMapping("/user/hello")
    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    public ResponseEntity<String> userHello() {
        return ResponseEntity.ok("hello user");
    }

    @GetMapping("/admin/hello")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> adminHello() {
        return ResponseEntity.ok("hello admin");
    }
}