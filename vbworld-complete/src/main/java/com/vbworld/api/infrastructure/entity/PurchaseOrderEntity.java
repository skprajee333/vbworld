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
@Table(name = "purchase_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "po_number", nullable = false, unique = true, length = 60)
    private String poNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id", nullable = false)
    private SupplierEntity supplier;

    @Enumerated(EnumType.STRING)
    @Column(name = "po_status", nullable = false, length = 40)
    private PurchaseOrderStatus poStatus;

    @Column(name = "expected_date")
    private LocalDate expectedDate;

    @Column(name = "reference_number", length = 120)
    private String referenceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PurchaseOrderItemEntity> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private UserEntity createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private UserEntity updatedBy;

    public enum PurchaseOrderStatus {
        DRAFT,
        SENT,
        PARTIALLY_RECEIVED,
        RECEIVED,
        CANCELLED
    }
}
