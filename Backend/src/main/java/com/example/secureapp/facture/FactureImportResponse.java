package com.example.secureapp.facture;

import lombok.Data;

import java.util.List;

@Data
public class FactureImportResponse {
    private FactureDto facture;
    private Extracted extracted;
    private String fileUrl;

    @Data
    public static class Extracted {
        private String numero;
        private String dateFacture;
        private Double montantHt;
        private Double tva;
        private Double montantTtc;
        private String prestataire;
        private List<String> warnings;
    }
}

