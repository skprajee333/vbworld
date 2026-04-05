package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.DeliveryRouteService;
import com.vbworld.api.infrastructure.entity.DeliveryRouteEntity;
import com.vbworld.api.infrastructure.entity.IndentEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/delivery-routes")
@RequiredArgsConstructor
@Tag(name = "Delivery Routes", description = "Driver and vehicle assignment for scheduled branch deliveries")
@SecurityRequirement(name = "bearerAuth")
public class DeliveryRouteController {

    private final DeliveryRouteService deliveryRouteService;

    @GetMapping
    @Operation(summary = "List delivery routes for a date")
    public ResponseEntity<ApiResponse<List<DeliveryRouteService.DeliveryRouteResponse>>> listRoutes(
        @RequestParam LocalDate date,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            deliveryRouteService.listRoutes(date, currentUser)));
    }

    @GetMapping("/optimize")
    @Operation(summary = "Get optimized route recommendations for a date")
    public ResponseEntity<ApiResponse<List<DeliveryRouteService.RouteOptimizationRecommendation>>> optimizeRoutes(
        @RequestParam LocalDate date,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            deliveryRouteService.getOptimizationRecommendations(date, currentUser)
        ));
    }

    @PostMapping
    @Operation(summary = "Create a delivery route with assigned indents")
    public ResponseEntity<ApiResponse<DeliveryRouteService.DeliveryRouteResponse>> createRoute(
        @RequestBody CreateDeliveryRouteRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Delivery route created successfully",
            deliveryRouteService.createRoute(
                DeliveryRouteService.CreateRouteRequest.builder()
                    .routeDate(request.getRouteDate())
                    .deliverySlot(request.getDeliverySlot())
                    .routeName(request.getRouteName())
                    .driverName(request.getDriverName())
                    .driverPhone(request.getDriverPhone())
                    .vehicleNumber(request.getVehicleNumber())
                    .vehicleType(request.getVehicleType())
                    .notes(request.getNotes())
                    .indentIds(request.getIndentIds())
                    .build(),
                currentUser)));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update delivery route status")
    public ResponseEntity<ApiResponse<DeliveryRouteService.DeliveryRouteResponse>> updateStatus(
        @PathVariable UUID id,
        @RequestBody UpdateRouteStatusRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Delivery route status updated",
            deliveryRouteService.updateStatus(id, request.getStatus(), currentUser)));
    }

    @Data
    public static class CreateDeliveryRouteRequest {
        private LocalDate routeDate;
        private IndentEntity.DeliverySlot deliverySlot;
        private String routeName;
        private String driverName;
        private String driverPhone;
        private String vehicleNumber;
        private String vehicleType;
        private String notes;
        private List<UUID> indentIds;
    }

    @Data
    public static class UpdateRouteStatusRequest {
        private DeliveryRouteEntity.RouteStatus status;
    }
}
