package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.PurchaseOrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrderEntity, UUID> {

    Optional<PurchaseOrderEntity> findTopByOrderByCreatedAtDesc();

    @Query("""
        SELECT DISTINCT po FROM PurchaseOrderEntity po
        JOIN FETCH po.supplier s
        LEFT JOIN FETCH po.createdBy cb
        LEFT JOIN FETCH po.updatedBy ub
        LEFT JOIN FETCH po.items poi
        LEFT JOIN FETCH poi.item i
        LEFT JOIN FETCH i.category c
        WHERE po.id = :id
        """)
    Optional<PurchaseOrderEntity> findDetailedById(UUID id);

    @Query("""
        SELECT DISTINCT po FROM PurchaseOrderEntity po
        JOIN FETCH po.supplier s
        LEFT JOIN FETCH po.createdBy cb
        LEFT JOIN FETCH po.updatedBy ub
        LEFT JOIN FETCH po.items poi
        LEFT JOIN FETCH poi.item i
        LEFT JOIN FETCH i.category c
        ORDER BY po.createdAt DESC
        """)
    List<PurchaseOrderEntity> findAllDetailed();

    @Query("""
        SELECT DISTINCT po FROM PurchaseOrderEntity po
        JOIN FETCH po.supplier s
        LEFT JOIN FETCH po.createdBy cb
        LEFT JOIN FETCH po.updatedBy ub
        LEFT JOIN FETCH po.items poi
        LEFT JOIN FETCH poi.item i
        LEFT JOIN FETCH i.category c
        WHERE LOWER(po.poNumber) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(po.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
        ORDER BY po.createdAt DESC
        """)
    List<PurchaseOrderEntity> findAllDetailedBySearch(String search);
}
