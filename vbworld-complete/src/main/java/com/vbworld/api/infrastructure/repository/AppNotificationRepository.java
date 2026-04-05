package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.AppNotificationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface AppNotificationRepository extends JpaRepository<AppNotificationEntity, UUID> {

    @Query("""
        SELECT n FROM AppNotificationEntity n
        JOIN FETCH n.user u
        WHERE u.id = :userId
        AND (:unreadOnly = false OR n.read = false)
        ORDER BY n.createdAt DESC
        """)
    List<AppNotificationEntity> findForUser(UUID userId, boolean unreadOnly);

    @Modifying
    @Query("""
        UPDATE AppNotificationEntity n
        SET n.read = true, n.readAt = :readAt
        WHERE n.user.id = :userId AND n.read = false
        """)
    int markAllRead(UUID userId, LocalDateTime readAt);

    int countByUser_IdAndReadFalse(UUID userId);
}
