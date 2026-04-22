package com.example.secureapp.prestataire;

import com.example.secureapp.prestataire.dto.MissionResultDto;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class MissionResultController {
    private final MissionResultService service;

    public MissionResultController(MissionResultService service) {
        this.service = service;
    }

    @GetMapping("/api/missions/{missionId}/result")
    @PreAuthorize("hasAuthority('MISSION_READ')")
    public ResponseEntity<MissionResultDto> get(@PathVariable("missionId") Long missionId, Authentication authentication) {
        MissionResultDto dto = service.getByMission(missionId, authentication);
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/api/missions/{missionId}/result")
    @PreAuthorize("hasAuthority('MISSION_UPDATE')")
    public ResponseEntity<MissionResultDto> upsert(@PathVariable("missionId") Long missionId, @RequestBody MissionResultDto dto, Authentication authentication) {
        return ResponseEntity.ok(service.upsert(missionId, dto, authentication));
    }

    @PostMapping(value = "/api/missions/{missionId}/result/proof", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('MISSION_UPDATE')")
    public ResponseEntity<MissionResultDto> upload(@PathVariable("missionId") Long missionId, @RequestParam("file") MultipartFile file, Authentication authentication) {
        return ResponseEntity.ok(service.uploadProof(missionId, file, authentication));
    }

    @GetMapping("/api/missions/{missionId}/result/proof")
    @PreAuthorize("hasAuthority('MISSION_READ')")
    public ResponseEntity<byte[]> download(@PathVariable("missionId") Long missionId, Authentication authentication) {
        MissionResultEntity entity = service.getEntityByMission(missionId, authentication);
        if (entity == null || entity.getPreuve() == null || entity.getPreuve().length == 0) {
            return ResponseEntity.notFound().build();
        }
        String contentType = entity.getPreuveContentType() != null ? entity.getPreuveContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        String fileName = entity.getPreuveFileName() != null ? entity.getPreuveFileName() : "preuve";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName.replace("\"", "") + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(entity.getPreuve());
    }
}
