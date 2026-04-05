package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.IndentEntity;
import com.vbworld.api.infrastructure.entity.IndentEntity.Status;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface IndentRepository extends JpaRepository<IndentEntity, UUID>, JpaSpecificationExecutor<IndentEntity> {

    long countByStatus(Status status);

    @Query("""
        SELECT COUNT(i) FROM IndentEntity i
        WHERE i.status = :status
        AND i.createdAt >= :from
        """)
    long countByStatusSince(
        @org.springframework.data.repository.query.Param("status") Status status,
        @org.springframework.data.repository.query.Param("from") LocalDateTime from
    );

    List<IndentEntity> findByStatusIn(List<Status> statuses);

    List<IndentEntity> findByScheduledDeliveryDateAndStatusInOrderByPromisedDeliverySlotAscCreatedAtAsc(
        LocalDate scheduledDeliveryDate,
        List<Status> statuses
    );

    @Query("""
        SELECT COUNT(i) FROM IndentEntity i
        WHERE i.branch.id = :branchId
          AND i.scheduledDeliveryDate = :scheduledDate
          AND i.promisedDeliverySlot = :slot
          AND i.status NOT IN :excludedStatuses
        """)
    long countScheduledForSlot(
        @org.springframework.data.repository.query.Param("branchId") UUID branchId,
        @org.springframework.data.repository.query.Param("scheduledDate") LocalDate scheduledDate,
        @org.springframework.data.repository.query.Param("slot") IndentEntity.DeliverySlot slot,
        @org.springframework.data.repository.query.Param("excludedStatuses") List<Status> excludedStatuses
    );
}
