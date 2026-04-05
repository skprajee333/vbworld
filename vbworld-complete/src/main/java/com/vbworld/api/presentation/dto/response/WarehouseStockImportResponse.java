package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseStockImportResponse {
    private int processedRows;
    private int updatedRows;
    private int skippedRows;
    private List<String> errors;
}
