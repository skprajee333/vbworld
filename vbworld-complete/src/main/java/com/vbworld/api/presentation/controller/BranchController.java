package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.IndentService;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.BranchEntity;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.BranchResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
@Tag(name = "Branches", description = "Branch management")
@SecurityRequirement(name = "bearerAuth")
public class BranchController {

    private final BranchRepository branchRepository;
    private final IndentService indentService;

    @GetMapping
    @Operation(summary = "List all active branches")
    public ResponseEntity<ApiResponse<List<BranchResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(branchRepository.findAllByActiveTrue().stream()
            .map(this::toResponse)
            .toList()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get branch by ID")
    public ResponseEntity<ApiResponse<BranchResponse>> get(@PathVariable UUID id) {
        BranchEntity branch = branchRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + id));
        return ResponseEntity.ok(ApiResponse.ok(toResponse(branch)));
    }

    @GetMapping("/{id}/slot-availability")
    @Operation(summary = "Get delivery slot availability for a branch and date")
    public ResponseEntity<ApiResponse<Map<String, IndentService.SlotAvailability>>> slotAvailability(
        @PathVariable UUID id,
        @RequestParam LocalDate date
    ) {
        return ResponseEntity.ok(ApiResponse.ok(indentService.getSlotAvailability(id, date)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new branch (Admin only)")
    public ResponseEntity<ApiResponse<BranchResponse>> create(@Valid @RequestBody CreateBranchRequest req) {
        BranchEntity branch = BranchEntity.builder()
            .name(req.getName())
            .address(req.getAddress())
            .city(req.getCity() != null ? req.getCity() : "Chennai")
            .phone(req.getPhone())
            .orderCutoffTime(req.getOrderCutoffTime() != null ? req.getOrderCutoffTime() : LocalTime.of(17, 0))
            .orderLeadDays(req.getOrderLeadDays() != null ? req.getOrderLeadDays() : 1)
            .defaultDeliverySlot(req.getDefaultDeliverySlot() != null ? req.getDefaultDeliverySlot() : BranchEntity.DeliverySlot.MORNING)
            .morningSlotCapacity(req.getMorningSlotCapacity() != null ? req.getMorningSlotCapacity() : 12)
            .afternoonSlotCapacity(req.getAfternoonSlotCapacity() != null ? req.getAfternoonSlotCapacity() : 12)
            .eveningSlotCapacity(req.getEveningSlotCapacity() != null ? req.getEveningSlotCapacity() : 8)
            .forecastHorizonDays(req.getForecastHorizonDays() != null ? req.getForecastHorizonDays() : 3)
            .safetyStockDays(req.getSafetyStockDays() != null ? req.getSafetyStockDays() : 1)
            .autoReplenishEnabled(req.getAutoReplenishEnabled() != null && req.getAutoReplenishEnabled())
            .autoReplenishMinConfidencePct(req.getAutoReplenishMinConfidencePct() != null ? req.getAutoReplenishMinConfidencePct() : 55)
            .active(true)
            .build();

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Branch created", toResponse(branchRepository.save(branch))));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update branch (Admin only)")
    public ResponseEntity<ApiResponse<BranchResponse>> update(
        @PathVariable UUID id,
        @RequestBody UpdateBranchRequest req
    ) {
        BranchEntity branch = branchRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + id));

        if (req.getName() != null) branch.setName(req.getName());
        if (req.getAddress() != null) branch.setAddress(req.getAddress());
        if (req.getPhone() != null) branch.setPhone(req.getPhone());
        if (req.getOrderCutoffTime() != null) branch.setOrderCutoffTime(req.getOrderCutoffTime());
        if (req.getOrderLeadDays() != null) branch.setOrderLeadDays(req.getOrderLeadDays());
        if (req.getDefaultDeliverySlot() != null) branch.setDefaultDeliverySlot(req.getDefaultDeliverySlot());
        if (req.getMorningSlotCapacity() != null) branch.setMorningSlotCapacity(req.getMorningSlotCapacity());
        if (req.getAfternoonSlotCapacity() != null) branch.setAfternoonSlotCapacity(req.getAfternoonSlotCapacity());
        if (req.getEveningSlotCapacity() != null) branch.setEveningSlotCapacity(req.getEveningSlotCapacity());
        if (req.getForecastHorizonDays() != null) branch.setForecastHorizonDays(req.getForecastHorizonDays());
        if (req.getSafetyStockDays() != null) branch.setSafetyStockDays(req.getSafetyStockDays());
        if (req.getAutoReplenishEnabled() != null) branch.setAutoReplenishEnabled(req.getAutoReplenishEnabled());
        if (req.getAutoReplenishMinConfidencePct() != null) branch.setAutoReplenishMinConfidencePct(req.getAutoReplenishMinConfidencePct());
        if (req.getActive() != null) branch.setActive(req.getActive());

        return ResponseEntity.ok(ApiResponse.ok(toResponse(branchRepository.save(branch))));
    }

    private BranchResponse toResponse(BranchEntity branch) {
        return BranchResponse.builder()
            .id(branch.getId())
            .name(branch.getName())
            .address(branch.getAddress())
            .city(branch.getCity())
            .phone(branch.getPhone())
            .orderCutoffTime(branch.getOrderCutoffTime())
            .orderLeadDays(branch.getOrderLeadDays())
            .defaultDeliverySlot(branch.getDefaultDeliverySlot() != null ? branch.getDefaultDeliverySlot().name() : null)
            .morningSlotCapacity(branch.getMorningSlotCapacity())
            .afternoonSlotCapacity(branch.getAfternoonSlotCapacity())
            .eveningSlotCapacity(branch.getEveningSlotCapacity())
            .forecastHorizonDays(branch.getForecastHorizonDays())
            .safetyStockDays(branch.getSafetyStockDays())
            .autoReplenishEnabled(branch.isAutoReplenishEnabled())
            .autoReplenishMinConfidencePct(branch.getAutoReplenishMinConfidencePct())
            .active(branch.isActive())
            .createdAt(branch.getCreatedAt())
            .build();
    }

    @Data
    static class CreateBranchRequest {
        @NotBlank private String name;
        private String address;
        private String city;
        private String phone;
        private LocalTime orderCutoffTime;
        private Integer orderLeadDays;
        private BranchEntity.DeliverySlot defaultDeliverySlot;
        private Integer morningSlotCapacity;
        private Integer afternoonSlotCapacity;
        private Integer eveningSlotCapacity;
        private Integer forecastHorizonDays;
        private Integer safetyStockDays;
        private Boolean autoReplenishEnabled;
        private Integer autoReplenishMinConfidencePct;
    }

    @Data
    static class UpdateBranchRequest {
        private String name;
        private String address;
        private String phone;
        private LocalTime orderCutoffTime;
        private Integer orderLeadDays;
        private BranchEntity.DeliverySlot defaultDeliverySlot;
        private Integer morningSlotCapacity;
        private Integer afternoonSlotCapacity;
        private Integer eveningSlotCapacity;
        private Integer forecastHorizonDays;
        private Integer safetyStockDays;
        private Boolean autoReplenishEnabled;
        private Integer autoReplenishMinConfidencePct;
        private Boolean active;
    }
}
