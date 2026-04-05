package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.CustomerLoyaltyTransactionEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CustomerLoyaltyTransactionRepository extends JpaRepository<CustomerLoyaltyTransactionEntity, UUID> {

    @EntityGraph(attributePaths = {"branch", "createdBy", "order"})
    List<CustomerLoyaltyTransactionEntity> findTop30ByCustomer_IdOrderByCreatedAtDesc(UUID customerId);
}
