package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "warehouse_stock")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WarehouseStockEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", nullable = false, unique = true)
    private ItemEntity item;

    @Column(nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;

    @Column(name = "min_level", nullable = false, precision = 10, scale = 3)
    @Builder.Default
    private BigDecimal minLevel = BigDecimal.valueOf(5);

    @Column(name = "max_level", precision = 10, scale = 3)
    private BigDecimal maxLevel;

    @Column(name = "last_updated_at")
    @Builder.Default
    private LocalDateTime lastUpdatedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private UserEntity updatedBy;

    public StockStatus getStockStatus() {
        if (quantity.compareTo(minLevel) <= 0) return StockStatus.LOW;
        if (quantity.compareTo(minLevel.multiply(BigDecimal.valueOf(2))) <= 0)
            return StockStatus.MEDIUM;
        return StockStatus.OK;
    }

    public enum StockStatus { LOW, MEDIUM, OK }
}
