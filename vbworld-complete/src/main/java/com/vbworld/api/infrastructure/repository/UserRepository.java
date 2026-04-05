package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID> {

    Optional<UserEntity> findByEmail(String email);

    boolean existsByEmail(String email);

    // Find by status for admin approval panel
    List<UserEntity> findByStatusOrderByCreatedAtDesc(UserEntity.Status status);

    // All users except admin for admin panel view
    List<UserEntity> findAllByOrderByCreatedAtDesc();

    List<UserEntity> findByRoleInAndStatusAndActiveTrue(List<UserEntity.Role> roles, UserEntity.Status status);

    List<UserEntity> findByBranch_IdAndStatusAndActiveTrue(UUID branchId, UserEntity.Status status);

    @Modifying
    @Query("UPDATE UserEntity u SET u.lastLoginAt = :time WHERE u.id = :id")
    void updateLastLogin(UUID id, LocalDateTime time);
}
