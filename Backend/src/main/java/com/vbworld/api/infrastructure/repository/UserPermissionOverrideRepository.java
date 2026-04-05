package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.UserPermissionOverrideEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserPermissionOverrideRepository extends JpaRepository<UserPermissionOverrideEntity, UUID> {
    List<UserPermissionOverrideEntity> findByUser_IdOrderByPermissionKeyAsc(UUID userId);
    Optional<UserPermissionOverrideEntity> findByUser_IdAndPermissionKey(UUID userId, String permissionKey);
    void deleteByUser_IdAndPermissionKey(UUID userId, String permissionKey);
}
