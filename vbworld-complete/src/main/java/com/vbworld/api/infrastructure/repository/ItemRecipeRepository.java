package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.ItemRecipeEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ItemRecipeRepository extends JpaRepository<ItemRecipeEntity, UUID> {

    @EntityGraph(attributePaths = {"menuItem", "menuItem.category", "ingredients", "ingredients.ingredientItem", "ingredients.ingredientItem.category"})
    @Query("""
        SELECT r FROM ItemRecipeEntity r
        JOIN r.menuItem m
        WHERE (:search = ''
            OR LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(m.code) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY m.name
        """)
    List<ItemRecipeEntity> findDetailed(@Param("search") String search);

    @EntityGraph(attributePaths = {"menuItem", "ingredients", "ingredients.ingredientItem"})
    Optional<ItemRecipeEntity> findByMenuItem_Id(UUID menuItemId);

    @EntityGraph(attributePaths = {"menuItem", "ingredients", "ingredients.ingredientItem"})
    List<ItemRecipeEntity> findByMenuItem_IdInAndActiveTrue(Collection<UUID> menuItemIds);
}
