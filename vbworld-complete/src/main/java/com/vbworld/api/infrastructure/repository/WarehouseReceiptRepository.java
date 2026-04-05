package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.WarehouseReceiptEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WarehouseReceiptRepository extends JpaRepository<WarehouseReceiptEntity, UUID> {

    @Query("""
        SELECT r FROM WarehouseReceiptEntity r
        JOIN FETCH r.item i
        JOIN FETCH r.stock s
        JOIN FETCH r.receivedBy u
        LEFT JOIN FETCH r.supplier sup
        LEFT JOIN FETCH r.purchaseOrder po
        LEFT JOIN FETCH r.purchaseOrderItem poi
        LEFT JOIN FETCH r.resolvedBy rb
        LEFT JOIN FETCH i.category c
        WHERE (:search = ''
            OR LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(r.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(r.supplierName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(sup.name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(r.invoiceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(po.poNumber, '')) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY r.receivedAt DESC
        """)
    List<WarehouseReceiptEntity> findRecentReceipts(
        @org.springframework.data.repository.query.Param("search") String search
    );

    @Query("""
        SELECT r FROM WarehouseReceiptEntity r
        JOIN FETCH r.item i
        JOIN FETCH r.stock s
        JOIN FETCH r.receivedBy u
        LEFT JOIN FETCH r.supplier sup
        LEFT JOIN FETCH r.purchaseOrder po
        LEFT JOIN FETCH r.purchaseOrderItem poi
        LEFT JOIN FETCH r.resolvedBy rb
        LEFT JOIN FETCH i.category c
        WHERE r.id = :id
        """)
    java.util.Optional<WarehouseReceiptEntity> findDetailedById(
        @org.springframework.data.repository.query.Param("id") java.util.UUID id
    );
}
