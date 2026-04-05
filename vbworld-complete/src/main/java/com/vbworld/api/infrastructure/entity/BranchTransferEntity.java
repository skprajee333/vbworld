package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "branch_transfers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BranchTransferEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", nullable = false)
    private ItemEntity item;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_id", nullable = false)
    private WarehouseStockEntity stock;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "destination_branch_id", nullable = false)
    private BranchEntity destinationBranch;

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_status", nullable = false, length = 30)
    private TransferStatus transferStatus;

    @Column(name = "quantity_transferred", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityTransferred;

    @Column(name = "quantity_before", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityBefore;

    @Column(name = "quantity_after", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityAfter;

    @Column(name = "reference_number", length = 120)
    private String referenceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "transferred_at", nullable = false)
    private LocalDateTime transferredAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transferred_by")
    private UserEntity transferredBy;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "received_by")
    private UserEntity receivedBy;

    public enum TransferStatus {
        IN_TRANSIT,
        RECEIVED
    }
}
