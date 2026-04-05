package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "warehouse_stock_adjustments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WarehouseStockAdjustmentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private ItemEntity item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private WarehouseStockEntity stock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id")
    private WarehouseStockLotEntity lot;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_type", nullable = false, length = 30)
    private AdjustmentType adjustmentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_type", nullable = false, length = 40)
    @Builder.Default
    private ReasonType reasonType = ReasonType.GENERAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "impact_type", nullable = false, length = 40)
    @Builder.Default
    private ImpactType impactType = ImpactType.GENERAL;

    @Column(name = "quantity_delta", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityDelta;

    @Column(name = "quantity_before", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityBefore;

    @Column(name = "quantity_after", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityAfter;

    @Column(nullable = false, length = 200)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "adjusted_at", nullable = false)
    @Builder.Default
    private LocalDateTime adjustedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adjusted_by", nullable = false)
    private UserEntity adjustedBy;

    public enum AdjustmentType {
        INCREASE,
        DECREASE,
        SET_COUNT
    }

    public enum ReasonType {
        GENERAL,
        WASTAGE,
        SPOILAGE,
        EXPIRED,
        DAMAGE,
        DEAD_STOCK,
        STOCK_AUDIT
    }

    public enum ImpactType {
        GENERAL,
        WASTAGE,
        DEAD_STOCK
    }
}
