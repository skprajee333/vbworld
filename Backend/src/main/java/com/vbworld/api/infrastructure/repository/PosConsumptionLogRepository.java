package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.PosConsumptionLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface PosConsumptionLogRepository extends JpaRepository<PosConsumptionLogEntity, UUID> {

    @Query("""
        SELECT l.orderItem.id, COALESCE(SUM(l.quantityConsumed), 0)
        FROM PosConsumptionLogEntity l
        WHERE l.orderItem.id IN :orderItemIds
        GROUP BY l.orderItem.id
        """)
    List<Object[]> sumConsumedByOrderItemIds(@Param("orderItemIds") List<UUID> orderItemIds);

    @Query("""
        SELECT COALESCE(SUM(l.quantityConsumed), 0)
        FROM PosConsumptionLogEntity l
        WHERE l.ingredientItem.id = :ingredientItemId
        """)
    BigDecimal getTotalConsumedForIngredient(@Param("ingredientItemId") UUID ingredientItemId);
}
