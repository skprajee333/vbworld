package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.PosOrderEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PosOrderRepository extends JpaRepository<PosOrderEntity, UUID> {

    @EntityGraph(attributePaths = {"table", "items", "items.item", "customer"})
    List<PosOrderEntity> findByBranch_IdAndOrderStatusInOrderByCreatedAtDesc(
        UUID branchId,
        Collection<PosOrderEntity.OrderStatus> statuses
    );

    @EntityGraph(attributePaths = {"table", "items", "items.item", "customer"})
    Optional<PosOrderEntity> findFirstByTable_IdAndOrderStatusInOrderByCreatedAtDesc(
        UUID tableId,
        Collection<PosOrderEntity.OrderStatus> statuses
    );

    @EntityGraph(attributePaths = {"payments", "customer"})
    List<PosOrderEntity> findByBranch_IdAndUpdatedBy_IdAndPaidAtBetweenOrderByPaidAtDesc(
        UUID branchId,
        UUID updatedById,
        LocalDateTime from,
        LocalDateTime to
    );

    @EntityGraph(attributePaths = {"table", "payments", "updatedBy", "customer"})
    List<PosOrderEntity> findByBranch_IdAndPaidAtBetweenOrderByPaidAtDesc(
        UUID branchId,
        LocalDateTime from,
        LocalDateTime to
    );

    @EntityGraph(attributePaths = {"table", "payments", "updatedBy", "customer"})
    List<PosOrderEntity> findTop20ByCustomer_IdOrderByPaidAtDesc(UUID customerId);
}
