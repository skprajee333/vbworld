package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.SupplierItemMappingEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplierItemMappingRepository extends JpaRepository<SupplierItemMappingEntity, UUID> {

    @Query("""
        SELECT m FROM SupplierItemMappingEntity m
        JOIN FETCH m.supplier s
        JOIN FETCH m.item i
        LEFT JOIN FETCH i.category c
        WHERE s.id = :supplierId
        ORDER BY m.preferred DESC, m.active DESC, i.name
        """)
    List<SupplierItemMappingEntity> findBySupplierIdDetailed(@Param("supplierId") UUID supplierId);

    @Query("""
        SELECT m FROM SupplierItemMappingEntity m
        JOIN FETCH m.supplier s
        JOIN FETCH m.item i
        LEFT JOIN FETCH i.category c
        WHERE i.id IN :itemIds
          AND m.active = true
          AND s.active = true
        ORDER BY m.preferred DESC, i.name, s.name
        """)
    List<SupplierItemMappingEntity> findActiveMappingsForItems(@Param("itemIds") Collection<UUID> itemIds);

    Optional<SupplierItemMappingEntity> findBySupplier_IdAndItem_Id(UUID supplierId, UUID itemId);

    @Modifying
    @Query("""
        UPDATE SupplierItemMappingEntity m
        SET m.preferred = false
        WHERE m.item.id = :itemId
          AND m.id <> :mappingId
        """)
    void clearPreferredForItemExcept(@Param("itemId") UUID itemId, @Param("mappingId") UUID mappingId);

    @Modifying
    @Query("""
        UPDATE SupplierItemMappingEntity m
        SET m.preferred = false
        WHERE m.item.id = :itemId
        """)
    void clearPreferredForItem(@Param("itemId") UUID itemId);
}
