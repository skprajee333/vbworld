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
@Table(name = "indents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IndentEntity {

    public enum DeliverySlot {
        MORNING,
        AFTERNOON,
        EVENING
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "indent_number", nullable = false, unique = true, length = 30)
    private String indentNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private BranchEntity branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private UserEntity createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "expected_date")
    private LocalDate expectedDate;

    @Column(name = "scheduled_delivery_date")
    private LocalDate scheduledDeliveryDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "requested_delivery_slot", length = 20)
    private DeliverySlot requestedDeliverySlot;

    @Enumerated(EnumType.STRING)
    @Column(name = "promised_delivery_slot", length = 20)
    private DeliverySlot promisedDeliverySlot;

    @Column(name = "cutoff_applied", nullable = false)
    @Builder.Default
    private boolean cutoffApplied = false;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private UserEntity approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dispatched_by")
    private UserEntity dispatchedBy;

    @Column(name = "dispatched_at")
    private LocalDateTime dispatchedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivered_by")
    private UserEntity deliveredBy;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @OneToMany(mappedBy = "indent",
               cascade = CascadeType.ALL,
               orphanRemoval = true,
               fetch = FetchType.LAZY)
    @Builder.Default
    private List<IndentItemEntity> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Status {
        DRAFT, SUBMITTED, APPROVED, PACKED, DISPATCHED, DELIVERED, CANCELLED
    }

    public void addItem(IndentItemEntity item) {
        item.setIndent(this);
        this.items.add(item);
    }
}
