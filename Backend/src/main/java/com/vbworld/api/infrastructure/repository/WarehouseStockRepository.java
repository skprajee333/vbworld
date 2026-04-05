package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.WarehouseStockEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WarehouseStockRepository extends JpaRepository<WarehouseStockEntity, UUID> {

    Optional<WarehouseStockEntity> findByItem_Id(UUID itemId);

    @Query("""
        SELECT w FROM WarehouseStockEntity w
        JOIN FETCH w.item i
        LEFT JOIN FETCH i.category c
        WHERE LOWER(i.code) = LOWER(:itemCode)
        """)
    Optional<WarehouseStockEntity> findDetailedByItemCode(
        @org.springframework.data.repository.query.Param("itemCode") String itemCode
    );

    @Query("""
        SELECT w FROM WarehouseStockEntity w
        JOIN FETCH w.item i
        LEFT JOIN FETCH i.category c
        WHERE i.active = true
        ORDER BY c.sortOrder, i.name
        """)
    List<WarehouseStockEntity> findAllWithItems();

    @Query("""
        SELECT w FROM WarehouseStockEntity w
        JOIN FETCH w.item i
        LEFT JOIN FETCH i.category c
        WHERE i.active = true
        AND LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
        ORDER BY c.sortOrder, i.name
        """)
    List<WarehouseStockEntity> findAllWithItemsBySearch(
        @org.springframework.data.repository.query.Param("search") String search
    );

    @Query("""
        SELECT w FROM WarehouseStockEntity w
        JOIN FETCH w.item i
        WHERE w.quantity <= w.minLevel
        AND i.active = true
        ORDER BY w.quantity ASC
        """)
    List<WarehouseStockEntity> findLowStockItems();

    @Query("SELECT COUNT(w) FROM WarehouseStockEntity w WHERE w.quantity <= w.minLevel")
    long countByQuantityLessThanEqualMinLevel();
}
