package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "warehouse_stock_lots")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WarehouseStockLotEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private WarehouseStockEntity stock;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private ItemEntity item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private SupplierEntity supplier;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_receipt_id")
    private WarehouseReceiptEntity sourceReceipt;

    @Column(name = "batch_number", length = 120)
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "received_uom", length = 40)
    private String receivedUom;

    @Column(name = "units_per_pack", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal unitsPerPack = BigDecimal.ONE;

    @Column(name = "quantity_received", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityReceived;

    @Column(name = "base_quantity_received", nullable = false, precision = 12, scale = 3)
    private BigDecimal baseQuantityReceived;

    @Column(name = "remaining_quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal remainingQuantity;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "reference_number", length = 50)
    private String referenceNumber;

    @Column(name = "invoice_number", length = 120)
    private String invoiceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "received_at", nullable = false)
    @Builder.Default
    private LocalDateTime receivedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by")
    private UserEntity receivedBy;

    public String getLotStatus() {
        if (expiryDate != null && expiryDate.isBefore(LocalDate.now())) {
            return "EXPIRED";
        }
        if (expiryDate != null && !expiryDate.isAfter(LocalDate.now().plusDays(7))) {
            return "EXPIRING_SOON";
        }
        return "ACTIVE";
    }
}
