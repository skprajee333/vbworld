package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "delivery_routes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeliveryRouteEntity {

    public enum RouteStatus {
        PLANNED,
        DISPATCHED,
        COMPLETED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "route_date", nullable = false)
    private LocalDate routeDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_slot", nullable = false, length = 20)
    private IndentEntity.DeliverySlot deliverySlot;

    @Column(name = "route_name", nullable = false, length = 120)
    private String routeName;

    @Column(name = "driver_name", nullable = false, length = 120)
    private String driverName;

    @Column(name = "driver_phone", length = 20)
    private String driverPhone;

    @Column(name = "vehicle_number", nullable = false, length = 40)
    private String vehicleNumber;

    @Column(name = "vehicle_type", length = 40)
    private String vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "route_status", nullable = false, length = 20)
    @Builder.Default
    private RouteStatus routeStatus = RouteStatus.PLANNED;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by")
    private UserEntity assignedBy;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DeliveryRouteIndentEntity> routeIndents = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void addIndent(DeliveryRouteIndentEntity routeIndent) {
        routeIndent.setRoute(this);
        this.routeIndents.add(routeIndent);
    }
}
