package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.PosCashierShiftEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PosCashierShiftRepository extends JpaRepository<PosCashierShiftEntity, UUID> {

    Optional<PosCashierShiftEntity> findFirstByBranch_IdAndUser_IdAndShiftStatusOrderByOpenedAtDesc(
        UUID branchId,
        UUID userId,
        PosCashierShiftEntity.ShiftStatus shiftStatus
    );

    @EntityGraph(attributePaths = {"user"})
    List<PosCashierShiftEntity> findByBranch_IdAndOpenedAtBetweenOrderByOpenedAtDesc(
        UUID branchId,
        LocalDateTime from,
        LocalDateTime to
    );
}
