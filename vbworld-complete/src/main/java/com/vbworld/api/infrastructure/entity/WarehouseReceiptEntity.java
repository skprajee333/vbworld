package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "warehouse_receipts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WarehouseReceiptEntity {

    public enum ReceiptStatus {
        RECEIVED_OK,
        RECEIVED_WITH_DISCREPANCY
    }

    public enum ResolutionStatus {
        NOT_REQUIRED,
        OPEN,
        RETURN_TO_VENDOR,
        REPLACEMENT_PENDING,
        CLOSED
    }

    public enum ReturnStatus {
        NOT_REQUIRED,
        PENDING,
        COMPLETED
    }

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
    @JoinColumn(name = "supplier_id")
    private SupplierEntity supplier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_id")
    private PurchaseOrderEntity purchaseOrder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_order_item_id")
    private PurchaseOrderItemEntity purchaseOrderItem;

    @Column(name = "reference_number", length = 50)
    private String referenceNumber;

    @Column(name = "supplier_name", length = 150)
    private String supplierName;

    @Column(name = "quantity_received", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityReceived;

    @Column(name = "received_uom", length = 40)
    private String receivedUom;

    @Column(name = "units_per_pack", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal unitsPerPack = BigDecimal.ONE;

    @Column(name = "base_quantity_received", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal baseQuantityReceived = BigDecimal.ZERO;

    @Column(name = "batch_number", length = 120)
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "ordered_quantity", precision = 12, scale = 3)
    private BigDecimal orderedQuantity;

    @Column(name = "shortage_quantity", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal shortageQuantity = BigDecimal.ZERO;

    @Column(name = "damaged_quantity", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal damagedQuantity = BigDecimal.ZERO;

    @Column(name = "quantity_before", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityBefore;

    @Column(name = "quantity_after", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityAfter;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "invoice_number", length = 120)
    private String invoiceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(name = "receipt_status", nullable = false, length = 40)
    @Builder.Default
    private ReceiptStatus receiptStatus = ReceiptStatus.RECEIVED_OK;

    @Enumerated(EnumType.STRING)
    @Column(name = "resolution_status", nullable = false, length = 40)
    @Builder.Default
    private ResolutionStatus resolutionStatus = ResolutionStatus.NOT_REQUIRED;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private UserEntity resolvedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_status", nullable = false, length = 40)
    @Builder.Default
    private ReturnStatus returnStatus = ReturnStatus.NOT_REQUIRED;

    @Column(name = "returned_quantity", precision = 12, scale = 3)
    private BigDecimal returnedQuantity;

    @Column(name = "return_reference", length = 120)
    private String returnReference;

    @Column(name = "return_notes", columnDefinition = "TEXT")
    private String returnNotes;

    @Column(name = "returned_at")
    private LocalDateTime returnedAt;

    @Column(name = "received_at", nullable = false)
    @Builder.Default
    private LocalDateTime receivedAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by", nullable = false)
    private UserEntity receivedBy;
}
