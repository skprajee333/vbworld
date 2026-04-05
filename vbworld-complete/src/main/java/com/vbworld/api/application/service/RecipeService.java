package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.ItemEntity;
import com.vbworld.api.infrastructure.entity.ItemRecipeEntity;
import com.vbworld.api.infrastructure.entity.ItemRecipeIngredientEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.ItemRecipeRepository;
import com.vbworld.api.infrastructure.repository.ItemRepository;
import com.vbworld.api.presentation.dto.response.RecipeResponse;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final ItemRecipeRepository itemRecipeRepository;
    private final ItemRepository itemRepository;
    private final GovernanceService governanceService;

    @Transactional(readOnly = true)
    public List<RecipeResponse> listRecipes(String search) {
        String normalizedSearch = search != null && !search.isBlank() ? search.trim() : "";
        return itemRecipeRepository.findDetailed(normalizedSearch).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public RecipeResponse saveRecipe(SaveRecipeRequest request, UserEntity currentUser) {
        if (request.getMenuItemId() == null) {
            throw new IllegalArgumentException("Menu item is required");
        }
        if (request.getIngredients() == null || request.getIngredients().isEmpty()) {
            throw new IllegalArgumentException("At least one ingredient line is required");
        }

        ItemEntity menuItem = itemRepository.findById(request.getMenuItemId())
            .orElseThrow(() -> new ResourceNotFoundException("Menu item not found: " + request.getMenuItemId()));
        ItemRecipeEntity recipe = itemRecipeRepository.findByMenuItem_Id(menuItem.getId())
            .orElse(ItemRecipeEntity.builder().menuItem(menuItem).ingredients(new ArrayList<>()).build());
        boolean isNew = recipe.getId() == null;

        recipe.setOutputQuantity(request.getOutputQuantity() != null && request.getOutputQuantity().compareTo(BigDecimal.ZERO) > 0
            ? request.getOutputQuantity()
            : BigDecimal.ONE);
        recipe.setNotes(trim(request.getNotes()));
        recipe.setActive(request.getActive() == null || request.getActive());
        recipe.getIngredients().clear();

        for (SaveIngredientRequest line : request.getIngredients()) {
            if (line.getIngredientItemId() == null) {
                throw new IllegalArgumentException("Ingredient item is required for every line");
            }
            if (menuItem.getId().equals(line.getIngredientItemId())) {
                throw new IllegalArgumentException("Menu item cannot consume itself");
            }
            BigDecimal quantityRequired = line.getQuantityRequired() != null ? line.getQuantityRequired() : BigDecimal.ZERO;
            if (quantityRequired.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Ingredient quantity must be greater than zero");
            }

            ItemEntity ingredientItem = itemRepository.findById(line.getIngredientItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Ingredient item not found: " + line.getIngredientItemId()));

            recipe.addIngredient(ItemRecipeIngredientEntity.builder()
                .ingredientItem(ingredientItem)
                .quantityRequired(quantityRequired)
                .wastagePct(line.getWastagePct() != null ? line.getWastagePct() : BigDecimal.ZERO)
                .notes(trim(line.getNotes()))
                .build());
        }

        ItemRecipeEntity saved = itemRecipeRepository.save(recipe);
        governanceService.logAction(
            currentUser,
            "RECIPE",
            isNew ? "RECIPE_CREATED" : "RECIPE_UPDATED",
            "ITEM_RECIPE",
            saved.getId(),
            "Saved recipe for " + saved.getMenuItem().getName(),
            "ingredientLines=" + saved.getIngredients().size());
        return toResponse(saved);
    }

    private RecipeResponse toResponse(ItemRecipeEntity entity) {
        return RecipeResponse.builder()
            .id(entity.getId())
            .menuItemId(entity.getMenuItem().getId())
            .menuItemCode(entity.getMenuItem().getCode())
            .menuItemName(entity.getMenuItem().getName())
            .menuItemCategory(entity.getMenuItem().getCategory() != null ? entity.getMenuItem().getCategory().getName() : null)
            .outputQuantity(entity.getOutputQuantity())
            .active(entity.isActive())
            .notes(entity.getNotes())
            .ingredients(entity.getIngredients().stream()
                .map(ingredient -> RecipeResponse.IngredientLine.builder()
                    .id(ingredient.getId())
                    .ingredientItemId(ingredient.getIngredientItem().getId())
                    .ingredientItemCode(ingredient.getIngredientItem().getCode())
                    .ingredientItemName(ingredient.getIngredientItem().getName())
                    .ingredientCategory(ingredient.getIngredientItem().getCategory() != null
                        ? ingredient.getIngredientItem().getCategory().getName()
                        : null)
                    .ingredientUnit(ingredient.getIngredientItem().getUnit())
                    .quantityRequired(ingredient.getQuantityRequired())
                    .wastagePct(ingredient.getWastagePct())
                    .notes(ingredient.getNotes())
                    .build())
                .toList())
            .build();
    }

    private String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @Getter
    @Builder
    public static class SaveRecipeRequest {
        private final UUID menuItemId;
        private final BigDecimal outputQuantity;
        private final String notes;
        private final Boolean active;
        private final List<SaveIngredientRequest> ingredients;
    }

    @Getter
    @Builder
    public static class SaveIngredientRequest {
        private final UUID ingredientItemId;
        private final BigDecimal quantityRequired;
        private final BigDecimal wastagePct;
        private final String notes;
    }
}
