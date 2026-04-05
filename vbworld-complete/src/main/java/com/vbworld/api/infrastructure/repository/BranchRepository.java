package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.BranchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BranchRepository extends JpaRepository<BranchEntity, UUID> {
    List<BranchEntity> findAllByActiveTrue();
    boolean existsByNameIgnoreCase(String name);
}
