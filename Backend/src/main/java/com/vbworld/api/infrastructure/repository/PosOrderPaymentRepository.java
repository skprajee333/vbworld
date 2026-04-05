package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.PosOrderPaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PosOrderPaymentRepository extends JpaRepository<PosOrderPaymentEntity, UUID> {
}
