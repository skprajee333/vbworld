package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.WarehouseStockAdjustmentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WarehouseStockAdjustmentRepository extends JpaRepository<WarehouseStockAdjustmentEntity, UUID> {

    @Query("""
        SELECT a FROM WarehouseStockAdjustmentEntity a
        JOIN FETCH a.item i
        JOIN FETCH a.stock s
        JOIN FETCH a.adjustedBy u
        LEFT JOIN FETCH a.lot l
        LEFT JOIN FETCH i.category c
        WHERE (:search = ''
            OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(a.reason, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(a.notes, '')) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY a.adjustedAt DESC
        """)
    List<WarehouseStockAdjustmentEntity> findRecentAdjustments(
        @org.springframework.data.repository.query.Param("search") String search
    );

    @Query("""
        SELECT a FROM WarehouseStockAdjustmentEntity a
        JOIN FETCH a.item i
        JOIN FETCH a.stock s
        JOIN FETCH a.adjustedBy u
        LEFT JOIN FETCH a.lot l
        LEFT JOIN FETCH i.category c
        WHERE a.impactType IN (
            com.vbworld.api.infrastructure.entity.WarehouseStockAdjustmentEntity$ImpactType.WASTAGE,
            com.vbworld.api.infrastructure.entity.WarehouseStockAdjustmentEntity$ImpactType.DEAD_STOCK
        )
        ORDER BY a.adjustedAt DESC
        """)
    List<WarehouseStockAdjustmentEntity> findWastageAndDeadStock();
}
