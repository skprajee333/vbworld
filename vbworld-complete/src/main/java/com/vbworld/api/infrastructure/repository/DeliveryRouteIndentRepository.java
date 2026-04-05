package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.DeliveryRouteIndentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DeliveryRouteIndentRepository extends JpaRepository<DeliveryRouteIndentEntity, UUID> {
    boolean existsByIndent_Id(UUID indentId);
}
