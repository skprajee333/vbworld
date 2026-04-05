package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.AggregatorOrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AggregatorOrderRepository extends JpaRepository<AggregatorOrderEntity, UUID> {

    @Query(value = """
    SELECT * FROM aggregator_orders a
    WHERE (:branchId IS NULL OR a.branch_id = :branchId)
      AND (:search = ''
        OR LOWER(CAST(a.external_order_id AS TEXT)) LIKE LOWER(CONCAT('%', :search, '%'))
        OR LOWER(COALESCE(a.customer_name, '')) LIKE LOWER(CONCAT('%', :search, '%'))
        OR LOWER(COALESCE(a.customer_phone, '')) LIKE LOWER(CONCAT('%', :search, '%')))
    ORDER BY a.ordered_at DESC
    """, nativeQuery = true)
List<AggregatorOrderEntity> findHubOrders(@Param("branchId") UUID branchId, @Param("search") String search);

    Optional<AggregatorOrderEntity> findBySourceAndExternalOrderId(
        AggregatorOrderEntity.Source source,
        String externalOrderId
    );
}
