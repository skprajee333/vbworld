package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "aggregator_integrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AggregatorIntegrationEntity {

    public enum IntegrationStatus {
        ACTIVE,
        INACTIVE,
        ERROR
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private BranchEntity branch;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AggregatorOrderEntity.Source source;

    @Column(name = "store_code", nullable = false, length = 80)
    private String storeCode;

    @Column(name = "outlet_name", length = 120)
    private String outletName;

    @Enumerated(EnumType.STRING)
    @Column(name = "integration_status", nullable = false, length = 20)
    @Builder.Default
    private IntegrationStatus integrationStatus = IntegrationStatus.ACTIVE;

    @Column(name = "auto_sync_enabled", nullable = false)
    @Builder.Default
    private boolean autoSyncEnabled = true;

    @Column(name = "sync_interval_minutes", nullable = false)
    @Builder.Default
    private Integer syncIntervalMinutes = 15;

    @Column(name = "last_sync_at")
    private LocalDateTime lastSyncAt;

    @Column(name = "last_sync_status", length = 20)
    private String lastSyncStatus;

    @Column(name = "last_sync_message", columnDefinition = "TEXT")
    private String lastSyncMessage;

    @Column(name = "last_order_imported_at")
    private LocalDateTime lastOrderImportedAt;

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
