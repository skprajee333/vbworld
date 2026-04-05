package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeResponse {
    private UUID id;
    private UUID menuItemId;
    private String menuItemCode;
    private String menuItemName;
    private String menuItemCategory;
    private BigDecimal outputQuantity;
    private boolean active;
    private String notes;
    private List<IngredientLine> ingredients;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IngredientLine {
        private UUID id;
        private UUID ingredientItemId;
        private String ingredientItemCode;
        private String ingredientItemName;
        private String ingredientCategory;
        private String ingredientUnit;
        private BigDecimal quantityRequired;
        private BigDecimal wastagePct;
        private String notes;
    }
}
