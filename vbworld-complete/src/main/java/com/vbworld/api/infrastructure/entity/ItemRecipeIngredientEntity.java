package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "item_recipe_ingredients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemRecipeIngredientEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private ItemRecipeEntity recipe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_item_id", nullable = false)
    private ItemEntity ingredientItem;

    @Column(name = "quantity_required", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantityRequired;

    @Column(name = "wastage_pct", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal wastagePct = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
