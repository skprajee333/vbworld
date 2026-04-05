package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.QrOrderSessionEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QrOrderSessionRepository extends JpaRepository<QrOrderSessionEntity, UUID> {

    @EntityGraph(attributePaths = {"branch", "table"})
    Optional<QrOrderSessionEntity> findBySessionTokenAndSessionStatus(String sessionToken, QrOrderSessionEntity.SessionStatus sessionStatus);

    List<QrOrderSessionEntity> findByTable_IdAndSessionStatus(UUID tableId, QrOrderSessionEntity.SessionStatus sessionStatus);
}
