package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "branches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BranchEntity {

    public enum DeliverySlot {
        MORNING,
        AFTERNOON,
        EVENING
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(nullable = false, length = 60)
    @Builder.Default
    private String city = "Chennai";

    @Column(length = 20)
    private String phone;

    @Column(name = "order_cutoff_time", nullable = false)
    @Builder.Default
    private LocalTime orderCutoffTime = LocalTime.of(17, 0);

    @Column(name = "order_lead_days", nullable = false)
    @Builder.Default
    private Integer orderLeadDays = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "default_delivery_slot", nullable = false, length = 20)
    @Builder.Default
    private DeliverySlot defaultDeliverySlot = DeliverySlot.MORNING;

    @Column(name = "morning_slot_capacity", nullable = false)
    @Builder.Default
    private Integer morningSlotCapacity = 12;

    @Column(name = "afternoon_slot_capacity", nullable = false)
    @Builder.Default
    private Integer afternoonSlotCapacity = 12;

    @Column(name = "evening_slot_capacity", nullable = false)
    @Builder.Default
    private Integer eveningSlotCapacity = 8;

    @Column(name = "forecast_horizon_days", nullable = false)
    @Builder.Default
    private Integer forecastHorizonDays = 3;

    @Column(name = "safety_stock_days", nullable = false)
    @Builder.Default
    private Integer safetyStockDays = 1;

    @Column(name = "auto_replenish_enabled", nullable = false)
    @Builder.Default
    private boolean autoReplenishEnabled = false;

    @Column(name = "auto_replenish_min_confidence_pct", nullable = false)
    @Builder.Default
    private Integer autoReplenishMinConfidencePct = 55;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
