package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.FeedbackEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FeedbackRepository extends JpaRepository<FeedbackEntity, UUID> {

    List<FeedbackEntity> findAllByOrderByCreatedAtDesc();

    List<FeedbackEntity> findByStatusOrderByCreatedAtDesc(String status);

    List<FeedbackEntity> findByUser_IdOrderByCreatedAtDesc(UUID userId);

    long countByStatusIgnoreCase(String status);
}
