package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {

    @Query("""
        SELECT a FROM AuditLogEntity a
        WHERE (
            :module = ''
            OR LOWER(a.moduleName) = LOWER(:module)
        ) AND (
            :search = ''
            OR LOWER(a.summary) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(a.actorName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(a.entityType, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(a.actionType, '')) LIKE LOWER(CONCAT('%', :search, '%'))
        )
        ORDER BY a.createdAt DESC
        """)
    List<AuditLogEntity> findRecent(String module, String search);

    List<AuditLogEntity> findTop12ByOrderByCreatedAtDesc();

    long countByCreatedAtAfter(LocalDateTime since);

    long countByActionTypeAndCreatedAtAfter(String actionType, LocalDateTime since);
}
