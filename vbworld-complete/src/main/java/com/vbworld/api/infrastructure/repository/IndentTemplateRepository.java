package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.IndentTemplateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IndentTemplateRepository extends JpaRepository<IndentTemplateEntity, UUID> {

    List<IndentTemplateEntity> findByBranch_IdOrderByUseCountDescCreatedAtDesc(UUID branchId);

    Optional<IndentTemplateEntity> findByIdAndBranch_Id(UUID id, UUID branchId);

    @Modifying
    @Query("UPDATE IndentTemplateEntity t SET t.useCount = t.useCount + 1, t.lastUsedAt = :now WHERE t.id = :id")
    void incrementUseCount(UUID id, LocalDateTime now);
}
