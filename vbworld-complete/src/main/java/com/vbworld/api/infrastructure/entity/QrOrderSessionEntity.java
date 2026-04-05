package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "qr_order_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QrOrderSessionEntity {

    public enum SessionStatus {
        ACTIVE,
        EXPIRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private BranchEntity branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id", nullable = false)
    private RestaurantTableEntity table;

    @Column(name = "session_token", nullable = false, unique = true, length = 80)
    private String sessionToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "session_status", nullable = false, length = 20)
    @Builder.Default
    private SessionStatus sessionStatus = SessionStatus.ACTIVE;

    @Column(name = "customer_name", length = 120)
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "last_ordered_at")
    private LocalDateTime lastOrderedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private UserEntity createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
