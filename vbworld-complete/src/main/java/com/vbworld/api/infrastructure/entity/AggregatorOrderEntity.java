package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "aggregator_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AggregatorOrderEntity {

    public enum Source {
        SWIGGY,
        ZOMATO,
        WEBSITE,
        PHONE
    }

    public enum AggregatorStatus {
        NEW,
        ACCEPTED,
        PREPARING,
        READY,
        DELIVERED,
        CANCELLED
    }

    public enum PaymentStatus {
        PENDING,
        PAID,
        FAILED,
        REFUNDED
    }

    public enum ReconciliationStatus {
        PENDING,
        MATCHED,
        DISPUTED,
        SETTLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private BranchEntity branch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Source source;

    @Column(name = "external_order_id", nullable = false, length = 80)
    private String externalOrderId;

    @Column(name = "customer_name", length = 120)
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;

    @Column(name = "items_json", nullable = false, columnDefinition = "TEXT")
    private String itemsJson;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "packaging_charge", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal packagingCharge = BigDecimal.ZERO;

    @Column(name = "delivery_charge", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal deliveryCharge = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "aggregator_status", nullable = false, length = 30)
    @Builder.Default
    private AggregatorStatus aggregatorStatus = AggregatorStatus.NEW;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "reconciliation_status", nullable = false, length = 30)
    @Builder.Default
    private ReconciliationStatus reconciliationStatus = ReconciliationStatus.PENDING;

    @Column(name = "payout_reference", length = 80)
    private String payoutReference;

    @Column(name = "payout_amount", precision = 12, scale = 2)
    private BigDecimal payoutAmount;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "ordered_at", nullable = false)
    private LocalDateTime orderedAt;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "reconciled_at")
    private LocalDateTime reconciledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private UserEntity createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private UserEntity updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
