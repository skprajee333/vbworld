package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.RecipeService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import com.vbworld.api.presentation.dto.response.RecipeResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recipes")
@RequiredArgsConstructor
@Tag(name = "Recipes", description = "POS recipe and ingredient consumption management")
@SecurityRequirement(name = "bearerAuth")
public class RecipeController {

    private final RecipeService recipeService;

    @GetMapping
    @Operation(summary = "List menu recipes and ingredient mappings")
    public ResponseEntity<ApiResponse<List<RecipeResponse>>> list(
        @RequestParam(required = false) String search
    ) {
        return ResponseEntity.ok(ApiResponse.ok(recipeService.listRecipes(search)));
    }

    @PostMapping
    @Operation(summary = "Create a recipe for a menu item")
    public ResponseEntity<ApiResponse<RecipeResponse>> create(
        @RequestBody SaveRecipeRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Recipe saved successfully",
            recipeService.saveRecipe(toRequest(request), currentUser)));
    }

    @PatchMapping
    @Operation(summary = "Update or replace a recipe for a menu item")
    public ResponseEntity<ApiResponse<RecipeResponse>> update(
        @RequestBody SaveRecipeRequest request,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            "Recipe updated successfully",
            recipeService.saveRecipe(toRequest(request), currentUser)));
    }

    private RecipeService.SaveRecipeRequest toRequest(SaveRecipeRequest request) {
        return RecipeService.SaveRecipeRequest.builder()
            .menuItemId(request.getMenuItemId())
            .outputQuantity(request.getOutputQuantity())
            .notes(request.getNotes())
            .active(request.getActive())
            .ingredients(request.getIngredients() != null ? request.getIngredients().stream()
                .map(line -> RecipeService.SaveIngredientRequest.builder()
                    .ingredientItemId(line.getIngredientItemId())
                    .quantityRequired(line.getQuantityRequired())
                    .wastagePct(line.getWastagePct())
                    .notes(line.getNotes())
                    .build())
                .toList() : List.of())
            .build();
    }

    @Data
    public static class SaveRecipeRequest {
        private UUID menuItemId;
        private BigDecimal outputQuantity;
        private String notes;
        private Boolean active;
        private List<IngredientLineRequest> ingredients;
    }

    @Data
    public static class IngredientLineRequest {
        private UUID ingredientItemId;
        private BigDecimal quantityRequired;
        private BigDecimal wastagePct;
        private String notes;
    }
}
