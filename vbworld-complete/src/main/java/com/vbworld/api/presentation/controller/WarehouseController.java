package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.WarehouseService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.entity.WarehouseReceiptEntity;
import com.vbworld.api.infrastructure.entity.WarehouseStockAdjustmentEntity;
import com.vbworld.api.presentation.dto.response.WarehouseAdjustmentResponse;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.WarehouseReceiptResponse;
import com.vbworld.api.presentation.dto.response.WarehouseStockImportResponse;
import com.vbworld.api.presentation.dto.response.WarehouseStockLotResponse;
import com.vbworld.api.presentation.dto.response.WarehouseStockResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/warehouse")
@RequiredArgsConstructor
@Tag(name = "Warehouse", description = "Warehouse stock management")
@SecurityRequirement(name = "bearerAuth")
public class WarehouseController {

    private final WarehouseService warehouseService;

    @GetMapping("/stock")
    @Operation(summary = "Get all warehouse stock")
    public ResponseEntity<ApiResponse<List<WarehouseStockResponse>>> getAllStock(
        @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getAllStock(search)));
    }

    @GetMapping(value = "/stock/export", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @Operation(summary = "Export current warehouse stock as Excel")
    public ResponseEntity<byte[]> exportStockWorkbook() {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=warehouse-stock.xlsx")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(warehouseService.exportCurrentStockWorkbook());
    }

    @GetMapping(value = "/stock/import-template", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @Operation(summary = "Download warehouse stock import template")
    public ResponseEntity<byte[]> downloadStockImportTemplate() {
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=warehouse-stock-import-template.xlsx")
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .body(warehouseService.exportStockImportTemplateWorkbook());
    }

    @PostMapping(value = "/stock/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Import current warehouse stock from Excel")
    public ResponseEntity<ApiResponse<WarehouseStockImportResponse>> importStockWorkbook(
        @RequestPart("file") MultipartFile file,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        WarehouseStockImportResponse result = warehouseService.importCurrentStockWorkbook(file, currentUser);
        String message = result.getErrors() == null || result.getErrors().isEmpty()
            ? "Stock workbook imported successfully"
            : "Stock workbook imported with some row errors";
        return ResponseEntity.ok(ApiResponse.ok(message, result));
    }

    @GetMapping("/stock/low")
    @Operation(summary = "Get low stock items")
    public ResponseEntity<ApiResponse<List<WarehouseStockResponse>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getLowStockItems()));
    }

    @GetMapping("/receipts")
    @Operation(summary = "Get recent warehouse receipts")
    public ResponseEntity<ApiResponse<List<WarehouseReceiptResponse>>> getRecentReceipts(
        @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getRecentReceipts(search)));
    }

    @GetMapping("/adjustments")
    @Operation(summary = "Get recent warehouse stock adjustments")
    public ResponseEntity<ApiResponse<List<WarehouseAdjustmentResponse>>> getRecentAdjustments(
        @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getRecentAdjustments(search)));
    }

    @GetMapping("/adjustments/wastage")
    @Operation(summary = "Get wastage and dead-stock adjustment log")
    public ResponseEntity<ApiResponse<List<WarehouseAdjustmentResponse>>> getWastageLog() {
        return ResponseEntity.ok(ApiResponse.ok(warehouseService.getWastageLog()));
    }

    @GetMapping("/lots")
    @Operation(summary = "Get warehouse stock lots with batch and expiry visibility")
    public ResponseEntity<ApiResponse<List<WarehouseStockLotResponse>>> getStockLots(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) Integer expiringWithinDays
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            warehouseService.getStockLots(search, expiringWithinDays)
        ));
    }

    @PatchMapping("/stock/{itemId}")
    @Operation(summary = "Update stock quantity")
    public ResponseEntity<ApiResponse<WarehouseStockResponse>> updateStock(
        @PathVariable UUID itemId,
        @RequestBody UpdateStockRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            warehouseService.updateStock(
                itemId, request.getQuantity(),
                request.getMinLevel(), request.getMaxLevel(),
                request.getNotes(), currentUser)));
    }

    @PostMapping("/stock/{itemId}/receive")
    @Operation(summary = "Receive stock into warehouse")
    public ResponseEntity<ApiResponse<WarehouseReceiptResponse>> receiveStock(
        @PathVariable UUID itemId,
        @RequestBody ReceiveStockRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Stock received successfully",
            warehouseService.receiveStock(
                itemId,
                request.getQuantityReceived(),
                request.getReceivedUom(),
                request.getUnitsPerPack(),
                request.getUnitCost(),
                request.getSupplierId(),
                request.getPurchaseOrderId(),
                request.getPurchaseOrderItemId(),
                request.getSupplierName(),
                request.getReferenceNumber(),
                request.getInvoiceNumber(),
                request.getBatchNumber(),
                request.getExpiryDate(),
                request.getOrderedQuantity(),
                request.getShortageQuantity(),
                request.getDamagedQuantity(),
                request.getNotes(),
                currentUser)));
    }

    @PostMapping("/stock/{itemId}/adjust")
    @Operation(summary = "Adjust warehouse stock with audit history")
    public ResponseEntity<ApiResponse<WarehouseAdjustmentResponse>> adjustStock(
        @PathVariable UUID itemId,
        @RequestBody AdjustStockRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Stock adjusted successfully",
            warehouseService.adjustStock(
                itemId,
                request.getAdjustmentType(),
                request.getReasonType(),
                request.getLotId(),
                request.getQuantityValue(),
                request.getReason(),
                request.getNotes(),
                currentUser)));
    }

    @PostMapping("/receipts/{receiptId}/resolve")
    @Operation(summary = "Resolve a GRN discrepancy")
    public ResponseEntity<ApiResponse<WarehouseReceiptResponse>> resolveReceipt(
        @PathVariable UUID receiptId,
        @RequestBody ResolveReceiptRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "GRN discrepancy updated successfully",
            warehouseService.resolveReceiptDiscrepancy(
                receiptId,
                request.getResolutionStatus(),
                request.getResolutionNotes(),
                currentUser)));
    }

    @PostMapping("/receipts/{receiptId}/return")
    @Operation(summary = "Record a vendor return for a discrepancy receipt")
    public ResponseEntity<ApiResponse<WarehouseReceiptResponse>> recordVendorReturn(
        @PathVariable UUID receiptId,
        @RequestBody RecordVendorReturnRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Vendor return recorded successfully",
            warehouseService.recordVendorReturn(
                receiptId,
                request.getReturnedQuantity(),
                request.getReturnReference(),
                request.getReturnNotes(),
                currentUser)));
    }

    @Data
    public static class UpdateStockRequest {
        private BigDecimal quantity;
        private BigDecimal minLevel;
        private BigDecimal maxLevel;
        private String notes;
    }

    @Data
    public static class ReceiveStockRequest {
        private BigDecimal quantityReceived;
        private String receivedUom;
        private BigDecimal unitsPerPack;
        private BigDecimal unitCost;
        private UUID supplierId;
        private UUID purchaseOrderId;
        private UUID purchaseOrderItemId;
        private String supplierName;
        private String referenceNumber;
        private String invoiceNumber;
        private String batchNumber;
        private LocalDate expiryDate;
        private BigDecimal orderedQuantity;
        private BigDecimal shortageQuantity;
        private BigDecimal damagedQuantity;
        private String notes;
    }

    @Data
    public static class AdjustStockRequest {
        private WarehouseStockAdjustmentEntity.AdjustmentType adjustmentType;
        private WarehouseStockAdjustmentEntity.ReasonType reasonType;
        private UUID lotId;
        private BigDecimal quantityValue;
        private String reason;
        private String notes;
    }

    @Data
    public static class ResolveReceiptRequest {
        private WarehouseReceiptEntity.ResolutionStatus resolutionStatus;
        private String resolutionNotes;
    }

    @Data
    public static class RecordVendorReturnRequest {
        private BigDecimal returnedQuantity;
        private String returnReference;
        private String returnNotes;
    }
}
