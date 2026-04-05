package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.GovernanceExceptionEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface GovernanceExceptionRepository extends JpaRepository<GovernanceExceptionEntity, UUID> {

    @EntityGraph(attributePaths = {"rule", "triggeredBy", "assignedTo"})
    @Query("""
        select e from GovernanceExceptionEntity e
        where (:status is null or e.status = :status)
          and (:riskLevel is null or e.riskLevel = :riskLevel)
        order by e.triggeredAt desc
        """)
    List<GovernanceExceptionEntity> findByFilters(GovernanceExceptionEntity.Status status, String riskLevel);

    @EntityGraph(attributePaths = {"rule", "triggeredBy", "assignedTo"})
    List<GovernanceExceptionEntity> findTop12ByOrderByTriggeredAtDesc();

    long countByStatusIn(List<GovernanceExceptionEntity.Status> statuses);

    long countByRiskLevelAndStatusIn(String riskLevel, List<GovernanceExceptionEntity.Status> statuses);

    long countByTriggeredAtAfter(LocalDateTime triggeredAt);
}
