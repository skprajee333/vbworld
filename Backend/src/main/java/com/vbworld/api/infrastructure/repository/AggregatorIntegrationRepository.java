package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.AggregatorIntegrationEntity;
import com.vbworld.api.infrastructure.entity.AggregatorOrderEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AggregatorIntegrationRepository extends JpaRepository<AggregatorIntegrationEntity, UUID> {

    @EntityGraph(attributePaths = {"branch", "createdBy", "updatedBy"})
    List<AggregatorIntegrationEntity> findAllByOrderByUpdatedAtDesc();

    @EntityGraph(attributePaths = {"branch", "createdBy", "updatedBy"})
    List<AggregatorIntegrationEntity> findByBranch_IdOrderByUpdatedAtDesc(UUID branchId);

    Optional<AggregatorIntegrationEntity> findByBranch_IdAndSourceAndStoreCode(
        UUID branchId,
        AggregatorOrderEntity.Source source,
        String storeCode
    );
}
