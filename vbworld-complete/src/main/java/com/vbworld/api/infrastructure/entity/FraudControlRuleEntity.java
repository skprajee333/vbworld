package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fraud_control_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FraudControlRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "rule_code", nullable = false, unique = true, length = 80)
    private String ruleCode;

    @Column(name = "rule_name", nullable = false, length = 150)
    private String ruleName;

    @Column(name = "module_scope", nullable = false, length = 80)
    private String moduleScope;

    @Column(name = "risk_level", nullable = false, length = 30)
    private String riskLevel;

    @Column(name = "threshold_value", precision = 14, scale = 2)
    private BigDecimal thresholdValue;

    @Column(name = "threshold_unit", length = 40)
    private String thresholdUnit;

    @Column(name = "is_enabled", nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "auto_create_exception", nullable = false)
    @Builder.Default
    private boolean autoCreateException = true;

    @Column(name = "escalation_roles", columnDefinition = "TEXT")
    private String escalationRoles;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
