package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.ItemService;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.ItemResponse;
import com.vbworld.api.presentation.dto.response.PagedResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
@Tag(name = "Items", description = "Items master management")
@SecurityRequirement(name = "bearerAuth")
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    @Operation(summary = "Search and list items")
    public ResponseEntity<ApiResponse<PagedResponse<ItemResponse>>> list(
        @RequestParam(required = false) String  search,
        @RequestParam(required = false) Integer categoryId,
        @RequestParam(defaultValue = "0")  int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            itemService.searchItems(search, categoryId, page, size)));
    }

    @GetMapping("/categories")
    @Operation(summary = "Get all categories")
    public ResponseEntity<ApiResponse<?>> categories() {
        return ResponseEntity.ok(ApiResponse.ok(itemService.getCategories()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create new item (Admin only)")
    public ResponseEntity<ApiResponse<ItemResponse>> create(
        @RequestBody CreateItemRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Item created",
                itemService.createItem(
                    request.getCode(), request.getName(),
                    request.getCategoryId(), request.getUnit(),
                    request.getReorderLevel(), request.getSalePrice())));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update item (Admin only)")
    public ResponseEntity<ApiResponse<ItemResponse>> update(
        @PathVariable UUID id,
        @RequestBody UpdateItemRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            itemService.updateItem(
                id, request.getName(), request.getCategoryId(),
                request.getUnit(), request.getReorderLevel(),
                request.getSalePrice(), request.getActive())));
    }

    @Data
    public static class CreateItemRequest {
        private String code;
        private String name;
        private Integer categoryId;
        private String unit;
        private BigDecimal reorderLevel;
        private BigDecimal salePrice;
    }

    @Data
    public static class UpdateItemRequest {
        private String name;
        private Integer categoryId;
        private String unit;
        private BigDecimal reorderLevel;
        private BigDecimal salePrice;
        private Boolean active;
    }
}
