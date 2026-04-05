package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pos_orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PosOrderEntity {

    public enum OrderType {
        DINE_IN,
        TAKEAWAY
    }

    public enum OrderStatus {
        OPEN,
        KOT_SENT,
        PAID,
        CANCELLED
    }

    public enum ServiceStatus {
        SEATED,
        ORDERING,
        PREPARING,
        SERVED,
        BILL_REQUESTED,
        CLOSED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private BranchEntity branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private RestaurantTableEntity table;

    @Column(name = "order_number", nullable = false, unique = true, length = 40)
    private String orderNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 20)
    private OrderType orderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_status", nullable = false, length = 20)
    @Builder.Default
    private OrderStatus orderStatus = OrderStatus.OPEN;

    @Column(name = "customer_name", length = 120)
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "assigned_staff_name", length = 120)
    private String assignedStaffName;

    @Column(name = "guest_count", nullable = false)
    @Builder.Default
    private Integer guestCount = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "service_status", nullable = false, length = 30)
    @Builder.Default
    private ServiceStatus serviceStatus = ServiceStatus.SEATED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private CustomerEntity customer;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "loyalty_redeemed_points", nullable = false)
    @Builder.Default
    private Integer loyaltyRedeemedPoints = 0;

    @Column(name = "loyalty_discount_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal loyaltyDiscountAmount = BigDecimal.ZERO;

    @Column(name = "coupon_code", length = 60)
    private String couponCode;

    @Column(name = "split_count", nullable = false)
    @Builder.Default
    private Integer splitCount = 1;

    @Column(name = "tax_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "kot_sent_at")
    private LocalDateTime kotSentAt;

    @Column(name = "billed_at")
    private LocalDateTime billedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "served_at")
    private LocalDateTime servedAt;

    @Column(name = "bill_requested_at")
    private LocalDateTime billRequestedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private UserEntity createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private UserEntity updatedBy;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PosOrderItemEntity> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PosOrderPaymentEntity> payments = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void addItem(PosOrderItemEntity item) {
        item.setOrder(this);
        this.items.add(item);
    }

    public void addPayment(PosOrderPaymentEntity payment) {
        payment.setOrder(this);
        this.payments.add(payment);
    }
}
