package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.DeliveryRouteEntity;
import com.vbworld.api.infrastructure.entity.DeliveryRouteIndentEntity;
import com.vbworld.api.infrastructure.entity.IndentEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.DeliveryRouteIndentRepository;
import com.vbworld.api.infrastructure.repository.DeliveryRouteRepository;
import com.vbworld.api.infrastructure.repository.IndentRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeliveryRouteService {

    private final DeliveryRouteRepository deliveryRouteRepository;
    private final DeliveryRouteIndentRepository deliveryRouteIndentRepository;
    private final IndentRepository indentRepository;
    private final GovernanceService governanceService;

    @Transactional(readOnly = true)
    public List<DeliveryRouteResponse> listRoutes(LocalDate date, UserEntity currentUser) {
        ensureWarehouseAccess(currentUser);
        return deliveryRouteRepository.findByRouteDateOrderByDeliverySlotAscCreatedAtAsc(date).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<RouteOptimizationRecommendation> getOptimizationRecommendations(LocalDate date, UserEntity currentUser) {
        ensureWarehouseAccess(currentUser);

        List<IndentEntity> plannedIndents = indentRepository.findByScheduledDeliveryDateAndStatusInOrderByPromisedDeliverySlotAscCreatedAtAsc(
            date,
            List.of(IndentEntity.Status.APPROVED, IndentEntity.Status.DISPATCHED, IndentEntity.Status.SUBMITTED)
        );

        List<IndentEntity> available = plannedIndents.stream()
            .filter(indent -> !deliveryRouteIndentRepository.existsByIndent_Id(indent.getId()))
            .toList();

        List<RouteOptimizationRecommendation> recommendations = new ArrayList<>();
        for (IndentEntity.DeliverySlot slot : IndentEntity.DeliverySlot.values()) {
            List<IndentEntity> slotIndents = available.stream()
                .filter(indent -> indent.getPromisedDeliverySlot() == slot)
                .sorted((left, right) -> {
                    String leftBranch = left.getBranch() != null ? left.getBranch().getName() : "";
                    String rightBranch = right.getBranch() != null ? right.getBranch().getName() : "";
                    int compare = leftBranch.compareToIgnoreCase(rightBranch);
                    return compare != 0 ? compare : left.getCreatedAt().compareTo(right.getCreatedAt());
                })
                .toList();

            int groupIndex = 1;
            List<IndentEntity> currentGroup = new ArrayList<>();
            int currentLoad = 0;
            for (IndentEntity indent : slotIndents) {
                int indentLoad = estimateLoadKg(indent);
                int threshold = suggestedVehicleFor(Math.max(currentLoad, 1)).capacityKg();
                if (!currentGroup.isEmpty() && currentLoad + indentLoad > threshold) {
                    recommendations.add(buildRecommendation(date, slot, groupIndex++, currentGroup));
                    currentGroup = new ArrayList<>();
                    currentLoad = 0;
                }
                currentGroup.add(indent);
                currentLoad += indentLoad;
            }
            if (!currentGroup.isEmpty()) {
                recommendations.add(buildRecommendation(date, slot, groupIndex, currentGroup));
            }
        }

        return recommendations;
    }

    @Transactional
    public DeliveryRouteResponse createRoute(CreateRouteRequest request, UserEntity currentUser) {
        ensureWarehouseAccess(currentUser);

        List<IndentEntity> indents = new ArrayList<>();
        for (UUID indentId : request.getIndentIds()) {
            IndentEntity indent = indentRepository.findById(indentId)
                .orElseThrow(() -> new ResourceNotFoundException("Indent not found: " + indentId));
            if (deliveryRouteIndentRepository.existsByIndent_Id(indentId)) {
                throw new BusinessException("Indent " + indent.getIndentNumber() + " is already assigned to a route");
            }
            if (indent.getStatus() == IndentEntity.Status.CANCELLED || indent.getStatus() == IndentEntity.Status.DELIVERED) {
                throw new BusinessException("Only active indents can be assigned to a route");
            }
            if (!request.getRouteDate().equals(indent.getScheduledDeliveryDate())) {
                throw new BusinessException("Indent " + indent.getIndentNumber() + " is not scheduled for " + request.getRouteDate());
            }
            if (indent.getPromisedDeliverySlot() != request.getDeliverySlot()) {
                throw new BusinessException("Indent " + indent.getIndentNumber() + " is not in the requested slot");
            }
            indents.add(indent);
        }

        DeliveryRouteEntity route = DeliveryRouteEntity.builder()
            .routeDate(request.getRouteDate())
            .deliverySlot(request.getDeliverySlot())
            .routeName(request.getRouteName())
            .driverName(request.getDriverName())
            .driverPhone(request.getDriverPhone())
            .vehicleNumber(request.getVehicleNumber())
            .vehicleType(request.getVehicleType())
            .notes(request.getNotes())
            .assignedBy(currentUser)
            .build();

        int stopOrder = 1;
        for (IndentEntity indent : indents) {
            route.addIndent(DeliveryRouteIndentEntity.builder()
                .indent(indent)
                .stopOrder(stopOrder++)
                .build());
        }

        DeliveryRouteEntity saved = deliveryRouteRepository.save(route);
        governanceService.logAction(
            currentUser,
            "DELIVERY_ROUTES",
            "ROUTE_CREATED",
            "DELIVERY_ROUTE",
            saved.getId(),
            "Created route " + saved.getRouteName(),
            "driver=" + saved.getDriverName() + ", vehicle=" + saved.getVehicleNumber()
        );
        return toResponse(saved);
    }

    @Transactional
    public DeliveryRouteResponse updateStatus(UUID routeId, DeliveryRouteEntity.RouteStatus status, UserEntity currentUser) {
        ensureWarehouseAccess(currentUser);
        DeliveryRouteEntity route = deliveryRouteRepository.findById(routeId)
            .orElseThrow(() -> new ResourceNotFoundException("Route not found: " + routeId));

        route.setRouteStatus(status);
        if (status == DeliveryRouteEntity.RouteStatus.DISPATCHED) {
            route.setDispatchedAt(LocalDateTime.now());
        }
        if (status == DeliveryRouteEntity.RouteStatus.COMPLETED) {
            route.setCompletedAt(LocalDateTime.now());
        }

        DeliveryRouteEntity saved = deliveryRouteRepository.save(route);
        governanceService.logAction(
            currentUser,
            "DELIVERY_ROUTES",
            "ROUTE_STATUS_UPDATED",
            "DELIVERY_ROUTE",
            saved.getId(),
            "Updated route " + saved.getRouteName() + " to " + status.name(),
            null
        );
        return toResponse(saved);
    }

    private void ensureWarehouseAccess(UserEntity currentUser) {
        if (!(currentUser.isWarehouse() || currentUser.isAdmin())) {
            throw new AccessDeniedException("You do not have permission to manage delivery routes");
        }
    }

    private DeliveryRouteResponse toResponse(DeliveryRouteEntity route) {
        return DeliveryRouteResponse.builder()
            .id(route.getId())
            .routeDate(route.getRouteDate())
            .deliverySlot(route.getDeliverySlot().name())
            .routeName(route.getRouteName())
            .driverName(route.getDriverName())
            .driverPhone(route.getDriverPhone())
            .vehicleNumber(route.getVehicleNumber())
            .vehicleType(route.getVehicleType())
            .routeStatus(route.getRouteStatus().name())
            .notes(route.getNotes())
            .assignedByName(route.getAssignedBy() != null ? route.getAssignedBy().getName() : null)
            .dispatchedAt(route.getDispatchedAt())
            .completedAt(route.getCompletedAt())
            .createdAt(route.getCreatedAt())
            .indents(route.getRouteIndents().stream()
                .map(routeIndent -> DeliveryRouteIndentView.builder()
                    .indentId(routeIndent.getIndent().getId())
                    .indentNumber(routeIndent.getIndent().getIndentNumber())
                    .branchId(routeIndent.getIndent().getBranch().getId())
                    .branchName(routeIndent.getIndent().getBranch().getName())
                    .stopOrder(routeIndent.getStopOrder())
                    .status(routeIndent.getIndent().getStatus().name())
                    .itemCount(routeIndent.getIndent().getItems().size())
                    .build())
                .toList())
            .build();
    }

    private RouteOptimizationRecommendation buildRecommendation(
        LocalDate date,
        IndentEntity.DeliverySlot slot,
        int groupIndex,
        List<IndentEntity> indents
    ) {
        int totalLoadKg = indents.stream().mapToInt(this::estimateLoadKg).sum();
        VehicleCapacitySuggestion vehicle = suggestedVehicleFor(totalLoadKg);
        return RouteOptimizationRecommendation.builder()
            .recommendationId(slot.name() + "-" + groupIndex)
            .routeDate(date)
            .deliverySlot(slot.name())
            .suggestedRouteName(slot.name() + " Cluster " + groupIndex)
            .suggestedVehicleType(vehicle.vehicleType())
            .suggestedVehicleCapacityKg(vehicle.capacityKg())
            .estimatedLoadKg(totalLoadKg)
            .estimatedStops(indents.size())
            .branches(indents.stream()
                .map(indent -> indent.getBranch() != null ? indent.getBranch().getName() : "Unknown")
                .distinct()
                .toList())
            .indents(indents.stream()
                .map(indent -> RouteOptimizationIndent.builder()
                    .indentId(indent.getId())
                    .indentNumber(indent.getIndentNumber())
                    .branchId(indent.getBranch().getId())
                    .branchName(indent.getBranch().getName())
                    .itemCount(indent.getItems().size())
                    .estimatedLoadKg(estimateLoadKg(indent))
                    .build())
                .toList())
            .build();
    }

    private int estimateLoadKg(IndentEntity indent) {
        return Math.max(8, indent.getItems().size() * 8);
    }

    private VehicleCapacitySuggestion suggestedVehicleFor(int totalLoadKg) {
        if (totalLoadKg <= 80) {
            return new VehicleCapacitySuggestion("TWO_WHEELER", 80);
        }
        if (totalLoadKg <= 250) {
            return new VehicleCapacitySuggestion("THREE_WHEELER", 250);
        }
        if (totalLoadKg <= 750) {
            return new VehicleCapacitySuggestion("MINI_TRUCK", 750);
        }
        return new VehicleCapacitySuggestion("LIGHT_TRUCK", 1500);
    }

    @Getter
    @Builder
    public static class DeliveryRouteResponse {
        private final UUID id;
        private final LocalDate routeDate;
        private final String deliverySlot;
        private final String routeName;
        private final String driverName;
        private final String driverPhone;
        private final String vehicleNumber;
        private final String vehicleType;
        private final String routeStatus;
        private final String notes;
        private final String assignedByName;
        private final LocalDateTime dispatchedAt;
        private final LocalDateTime completedAt;
        private final LocalDateTime createdAt;
        private final List<DeliveryRouteIndentView> indents;
    }

    @Getter
    @Builder
    public static class DeliveryRouteIndentView {
        private final UUID indentId;
        private final String indentNumber;
        private final UUID branchId;
        private final String branchName;
        private final Integer stopOrder;
        private final String status;
        private final int itemCount;
    }

    @Getter
    @Builder
    public static class CreateRouteRequest {
        private final LocalDate routeDate;
        private final IndentEntity.DeliverySlot deliverySlot;
        private final String routeName;
        private final String driverName;
        private final String driverPhone;
        private final String vehicleNumber;
        private final String vehicleType;
        private final String notes;
        private final List<UUID> indentIds;
    }

    @Getter
    @Builder
    public static class RouteOptimizationRecommendation {
        private final String recommendationId;
        private final LocalDate routeDate;
        private final String deliverySlot;
        private final String suggestedRouteName;
        private final String suggestedVehicleType;
        private final Integer suggestedVehicleCapacityKg;
        private final Integer estimatedLoadKg;
        private final Integer estimatedStops;
        private final List<String> branches;
        private final List<RouteOptimizationIndent> indents;
    }

    @Getter
    @Builder
    public static class RouteOptimizationIndent {
        private final UUID indentId;
        private final String indentNumber;
        private final UUID branchId;
        private final String branchName;
        private final Integer itemCount;
        private final Integer estimatedLoadKg;
    }

    private record VehicleCapacitySuggestion(String vehicleType, int capacityKg) {
    }
}
