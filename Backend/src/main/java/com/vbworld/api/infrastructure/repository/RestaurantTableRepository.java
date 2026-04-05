package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.RestaurantTableEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RestaurantTableRepository extends JpaRepository<RestaurantTableEntity, UUID> {
    List<RestaurantTableEntity> findByBranch_IdAndActiveTrueOrderByTableNumberAsc(UUID branchId);
}
