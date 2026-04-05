package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.WarehouseStockLotEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface WarehouseStockLotRepository extends JpaRepository<WarehouseStockLotEntity, UUID> {

    @Query("""
        SELECT l FROM WarehouseStockLotEntity l
        JOIN FETCH l.item i
        JOIN FETCH l.stock s
        LEFT JOIN FETCH i.category c
        LEFT JOIN FETCH l.supplier sup
        LEFT JOIN FETCH l.sourceReceipt sr
        WHERE (:search = ''
            OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(i.code) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(l.batchNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(sup.name, '')) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY l.expiryDate NULLS LAST, l.receivedAt DESC
        """)
    List<WarehouseStockLotEntity> findAllDetailed(@Param("search") String search);

    @Query("""
        SELECT l FROM WarehouseStockLotEntity l
        JOIN FETCH l.item i
        JOIN FETCH l.stock s
        LEFT JOIN FETCH i.category c
        LEFT JOIN FETCH l.supplier sup
        LEFT JOIN FETCH l.sourceReceipt sr
        WHERE l.expiryDate IS NOT NULL
          AND l.expiryDate <= :cutoffDate
          AND l.remainingQuantity > 0
        ORDER BY l.expiryDate, i.name
        """)
    List<WarehouseStockLotEntity> findExpiringBefore(@Param("cutoffDate") LocalDate cutoffDate);
}
