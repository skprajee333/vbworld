package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.SupplierService;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.SupplierItemMappingResponse;
import com.vbworld.api.presentation.dto.response.SupplierResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
@Tag(name = "Suppliers", description = "Supplier and vendor management")
@SecurityRequirement(name = "bearerAuth")
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    @Operation(summary = "List suppliers")
    public ResponseEntity<ApiResponse<List<SupplierResponse>>> listSuppliers(
        @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.getSuppliers(search)));
    }

    @PostMapping
    @Operation(summary = "Create supplier")
    public ResponseEntity<ApiResponse<SupplierResponse>> createSupplier(
        @RequestBody CreateSupplierRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Supplier created successfully",
            supplierService.createSupplier(toCreateCommand(request))
        ));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update supplier")
    public ResponseEntity<ApiResponse<SupplierResponse>> updateSupplier(
        @PathVariable UUID id,
        @RequestBody UpdateSupplierRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Supplier updated successfully",
            supplierService.updateSupplier(id, toUpdateCommand(request))
        ));
    }

    @GetMapping("/{id}/items")
    @Operation(summary = "List supplier-item mappings")
    public ResponseEntity<ApiResponse<List<SupplierItemMappingResponse>>> listMappings(
        @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(supplierService.getSupplierItemMappings(id)));
    }

    @PostMapping("/{id}/items")
    @Operation(summary = "Create or update supplier-item mapping")
    public ResponseEntity<ApiResponse<SupplierItemMappingResponse>> saveMapping(
        @PathVariable UUID id,
        @RequestBody SaveSupplierItemMappingRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Supplier item mapping saved successfully",
            supplierService.saveSupplierItemMapping(id, toSaveSupplierItemMappingCommand(request))
        ));
    }

    private SupplierService.CreateSupplierCommand toCreateCommand(CreateSupplierRequest request) {
        return new SupplierService.CreateSupplierCommand(
            request.getCode(),
            request.getName(),
            request.getContactPerson(),
            request.getPhone(),
            request.getEmail(),
            request.getLeadTimeDays(),
            request.getAddress(),
            request.getNotes(),
            request.getActive()
        );
    }

    private SupplierService.UpdateSupplierCommand toUpdateCommand(UpdateSupplierRequest request) {
        return new SupplierService.UpdateSupplierCommand(
            request.getCode(),
            request.getName(),
            request.getContactPerson(),
            request.getPhone(),
            request.getEmail(),
            request.getLeadTimeDays(),
            request.getAddress(),
            request.getNotes(),
            request.getActive()
        );
    }

    private SupplierService.SaveSupplierItemMappingCommand toSaveSupplierItemMappingCommand(
        SaveSupplierItemMappingRequest request
    ) {
        return new SupplierService.SaveSupplierItemMappingCommand(
            request.getItemId(),
            request.getSupplierSku(),
            request.getLastUnitCost(),
            request.getMinOrderQuantity(),
            request.getLeadTimeDays(),
            request.getPreferred(),
            request.getActive(),
            request.getNotes()
        );
    }

    @Data
    public static class CreateSupplierRequest {
        private String code;
        private String name;
        private String contactPerson;
        private String phone;
        private String email;
        private Integer leadTimeDays;
        private String address;
        private String notes;
        private Boolean active;
    }

    @Data
    public static class UpdateSupplierRequest {
        private String code;
        private String name;
        private String contactPerson;
        private String phone;
        private String email;
        private Integer leadTimeDays;
        private String address;
        private String notes;
        private Boolean active;
    }

    @Data
    public static class SaveSupplierItemMappingRequest {
        private UUID itemId;
        private String supplierSku;
        private java.math.BigDecimal lastUnitCost;
        private java.math.BigDecimal minOrderQuantity;
        private Integer leadTimeDays;
        private Boolean preferred;
        private Boolean active;
        private String notes;
    }
}
