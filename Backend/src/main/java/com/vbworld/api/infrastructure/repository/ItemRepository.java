package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.ItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.Optional;

@Repository
public interface ItemRepository extends JpaRepository<ItemEntity, UUID> {

    @Query("""
        SELECT i FROM ItemEntity i
        LEFT JOIN i.category c
        WHERE i.active = true
        AND LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
        AND (:categoryId IS NULL OR c.id = :categoryId)
        ORDER BY c.sortOrder, i.name
        """)
    Page<ItemEntity> searchItems(
        @Param("search") String search,
        @Param("categoryId") Integer categoryId,
        Pageable pageable
    );

    boolean existsByCode(String code);

    Optional<ItemEntity> findByCodeIgnoreCase(String code);
}
