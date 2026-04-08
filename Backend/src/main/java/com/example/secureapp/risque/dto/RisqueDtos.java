package com.example.secureapp.risque.dto;

import com.example.secureapp.risque.RisqueCategory;

import java.time.LocalDateTime;
import java.util.Map;

public class RisqueDtos {
    public record UpsertRequest(Map<String, Object> payload) {}

    public record ItemResponse(
            Long id,
            Long dossierId,
            RisqueCategory category,
            Map<String, Object> payload,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}

