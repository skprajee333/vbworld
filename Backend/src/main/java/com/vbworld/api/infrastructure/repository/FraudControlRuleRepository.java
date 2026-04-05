package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.FraudControlRuleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FraudControlRuleRepository extends JpaRepository<FraudControlRuleEntity, UUID> {
    List<FraudControlRuleEntity> findAllByOrderByModuleScopeAscRuleNameAsc();
    Optional<FraudControlRuleEntity> findByRuleCode(String ruleCode);
    long countByEnabledTrue();
}
