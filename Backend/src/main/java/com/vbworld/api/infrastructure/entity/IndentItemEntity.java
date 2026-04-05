package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "indent_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IndentItemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indent_id", nullable = false)
    private IndentEntity indent;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "item_id", nullable = false)
    private ItemEntity item;

    @Column(name = "requested_qty", nullable = false, precision = 10, scale = 3)
    private BigDecimal requestedQty;

    @Column(name = "approved_qty", precision = 10, scale = 3)
    private BigDecimal approvedQty;

    @Column(name = "delivered_qty", precision = 10, scale = 3)
    private BigDecimal deliveredQty;

    @Column(nullable = false, length = 10)
    private String unit;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
