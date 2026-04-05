package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.AppNotificationEntity;
import com.vbworld.api.infrastructure.entity.AuditLogEntity;
import com.vbworld.api.infrastructure.entity.FraudControlRuleEntity;
import com.vbworld.api.infrastructure.entity.GovernanceExceptionEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.entity.UserPermissionOverrideEntity;
import com.vbworld.api.infrastructure.repository.AppNotificationRepository;
import com.vbworld.api.infrastructure.repository.AuditLogRepository;
import com.vbworld.api.infrastructure.repository.FeedbackRepository;
import com.vbworld.api.infrastructure.repository.FraudControlRuleRepository;
import com.vbworld.api.infrastructure.repository.GovernanceExceptionRepository;
import com.vbworld.api.infrastructure.repository.IndentRepository;
import com.vbworld.api.infrastructure.repository.UserPermissionOverrideRepository;
import com.vbworld.api.infrastructure.repository.UserRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockRepository;
import com.vbworld.api.presentation.dto.response.AppNotificationResponse;
import com.vbworld.api.presentation.dto.response.AuditLogResponse;
import com.vbworld.api.presentation.dto.response.FraudControlRuleResponse;
import com.vbworld.api.presentation.dto.response.GovernanceExceptionResponse;
import com.vbworld.api.presentation.dto.response.PermissionMatrixResponse;
import com.vbworld.api.presentation.dto.response.SystemMonitorResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GovernanceService {

    private final AuditLogRepository auditLogRepository;
    private final AppNotificationRepository appNotificationRepository;
    private final UserRepository userRepository;
    private final UserPermissionOverrideRepository userPermissionOverrideRepository;
    private final FeedbackRepository feedbackRepository;
    private final FraudControlRuleRepository fraudControlRuleRepository;
    private final GovernanceExceptionRepository governanceExceptionRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final IndentRepository indentRepository;

    private static final Map<UserEntity.Role, Set<PermissionKey>> DEFAULT_PERMISSIONS = new EnumMap<>(UserEntity.Role.class);

    static {
        DEFAULT_PERMISSIONS.put(UserEntity.Role.ADMIN, Set.of(PermissionKey.values()));
        DEFAULT_PERMISSIONS.put(UserEntity.Role.WAREHOUSE_ADMIN, Set.of(
            PermissionKey.VIEW_AUDIT,
            PermissionKey.VIEW_SYSTEM_MONITOR,
            PermissionKey.MANAGE_USERS,
            PermissionKey.APPROVE_USERS,
            PermissionKey.MANAGE_PERMISSIONS,
            PermissionKey.MANAGE_EXCEPTION_RULES,
            PermissionKey.RESOLVE_EXCEPTIONS,
            PermissionKey.VIEW_FEEDBACK
        ));
        DEFAULT_PERMISSIONS.put(UserEntity.Role.WAREHOUSE_MANAGER, Set.of());
        DEFAULT_PERMISSIONS.put(UserEntity.Role.RESTAURANT_STAFF, Set.of());
    }

    @Transactional
    public void logAction(
        UserEntity actor,
        String moduleName,
        String actionType,
        String entityType,
        UUID entityId,
        String summary,
        String details
    ) {
        auditLogRepository.save(AuditLogEntity.builder()
            .actor(actor)
            .actorName(actor != null ? actor.getName() : null)
            .actorRole(actor != null ? actor.getRole().name() : null)
            .moduleName(moduleName)
            .actionType(actionType)
            .entityType(entityType)
            .entityId(entityId)
            .summary(summary)
            .details(details)
            .build());
    }

    @Transactional
    public void notifyUsers(
        List<UserEntity> recipients,
        String type,
        String title,
        String message,
        String actionUrl,
        String relatedEntityType,
        UUID relatedEntityId
    ) {
        if (recipients == null || recipients.isEmpty()) {
            return;
        }

        Map<UUID, UserEntity> uniqueRecipients = new LinkedHashMap<>();
        for (UserEntity recipient : recipients) {
            if (recipient != null && recipient.getId() != null) {
                uniqueRecipients.put(recipient.getId(), recipient);
            }
        }
        if (uniqueRecipients.isEmpty()) {
            return;
        }

        List<AppNotificationEntity> notifications = uniqueRecipients.values().stream()
            .map(user -> AppNotificationEntity.builder()
                .user(user)
                .notificationType(type)
                .title(title)
                .message(message)
                .actionUrl(actionUrl)
                .relatedEntityType(relatedEntityType)
                .relatedEntityId(relatedEntityId)
                .build())
            .toList();

        appNotificationRepository.saveAll(notifications);
        log.debug("Created {} notifications for type={}", notifications.size(), type);
    }

    @Transactional(readOnly = true)
    public List<AppNotificationResponse> listNotifications(boolean unreadOnly, UserEntity currentUser) {
        return appNotificationRepository.findForUser(currentUser.getId(), unreadOnly)
            .stream()
            .map(this::toNotificationResponse)
            .toList();
    }

    @Transactional
    public AppNotificationResponse markNotificationRead(UUID id, UserEntity currentUser) {
        AppNotificationEntity notification = appNotificationRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + id));

        if (!notification.getUser().getId().equals(currentUser.getId())) {
            throw new AccessDeniedException("You can only update your own notifications");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            appNotificationRepository.save(notification);
        }

        return toNotificationResponse(notification);
    }

    @Transactional
    public int markAllNotificationsRead(UserEntity currentUser) {
        return appNotificationRepository.markAllRead(currentUser.getId(), LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> listAuditLogs(String module, String search, UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.VIEW_AUDIT);
        String normalizedModule = module == null ? "" : module.trim();
        String normalizedSearch = search == null ? "" : search.trim();
        return auditLogRepository.findRecent(normalizedModule, normalizedSearch)
            .stream()
            .map(this::toAuditResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public PermissionMatrixResponse getPermissionMatrix(UUID userId, UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.MANAGE_PERMISSIONS);
        UserEntity target = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        assertCanManagePermissionsFor(currentUser, target);
        return buildPermissionMatrix(target);
    }

    @Transactional(readOnly = true)
    public PermissionMatrixResponse getMyPermissionMatrix(UserEntity currentUser) {
        return buildPermissionMatrix(currentUser);
    }

    @Transactional
    public PermissionMatrixResponse savePermissionMatrix(
        UUID userId,
        List<PermissionOverrideRequest> requests,
        UserEntity currentUser
    ) {
        requirePermission(currentUser, PermissionKey.MANAGE_PERMISSIONS);
        UserEntity target = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        assertCanManagePermissionsFor(currentUser, target);

        for (PermissionOverrideRequest request : requests == null ? List.<PermissionOverrideRequest>of() : requests) {
            PermissionKey key = PermissionKey.valueOf(request.key().trim().toUpperCase());
            boolean defaultEnabled = defaultPermissionsFor(target.getRole()).contains(key);
            if (request.enabled() == defaultEnabled) {
                userPermissionOverrideRepository.deleteByUser_IdAndPermissionKey(target.getId(), key.name());
                continue;
            }
            UserPermissionOverrideEntity override = userPermissionOverrideRepository
                .findByUser_IdAndPermissionKey(target.getId(), key.name())
                .orElse(UserPermissionOverrideEntity.builder()
                    .user(target)
                    .permissionKey(key.name())
                    .build());
            override.setEnabled(request.enabled());
            userPermissionOverrideRepository.save(override);
        }

        logAction(
            currentUser,
            "GOVERNANCE",
            "PERMISSION_MATRIX_UPDATED",
            "USER",
            target.getId(),
            "Updated permission matrix for " + target.getName(),
            "role=" + target.getRole().name());

        return buildPermissionMatrix(target);
    }

    @Transactional(readOnly = true)
    public SystemMonitorResponse getSystemMonitor(UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.VIEW_SYSTEM_MONITOR);
        LocalDateTime since = LocalDateTime.now().minusHours(24);
        List<GovernanceExceptionEntity.Status> openStatuses = List.of(
            GovernanceExceptionEntity.Status.OPEN,
            GovernanceExceptionEntity.Status.ESCALATED
        );
        return SystemMonitorResponse.builder()
            .generatedAt(LocalDateTime.now())
            .pendingApprovals(userRepository.findByStatusOrderByCreatedAtDesc(UserEntity.Status.PENDING).size())
            .openFeedbackCount(feedbackRepository.countByStatusIgnoreCase("OPEN"))
            .lowStockCount(warehouseStockRepository.countByQuantityLessThanEqualMinLevel())
            .submittedIndents(indentRepository.countByStatus(UserEntityIndentStatus.SUBMITTED.status))
            .unreadNotifications(appNotificationRepository.countByUser_IdAndReadFalse(currentUser.getId()))
            .governanceEvents24h(auditLogRepository.countByCreatedAtAfter(since))
            .impersonationEvents24h(auditLogRepository.countByActionTypeAndCreatedAtAfter("IMPERSONATION_STARTED", since))
            .openExceptions(governanceExceptionRepository.countByStatusIn(openStatuses))
            .highRiskExceptions(governanceExceptionRepository.countByRiskLevelAndStatusIn("HIGH", openStatuses))
            .activeFraudRules(fraudControlRuleRepository.countByEnabledTrue())
            .triggeredRules24h(governanceExceptionRepository.countByTriggeredAtAfter(since))
            .recentEvents(auditLogRepository.findTop12ByOrderByCreatedAtDesc().stream()
                .map(event -> SystemMonitorResponse.MonitorEvent.builder()
                    .moduleName(event.getModuleName())
                    .actionType(event.getActionType())
                    .actorName(event.getActorName())
                    .actorRole(event.getActorRole())
                    .summary(event.getSummary())
                    .createdAt(event.getCreatedAt())
                    .build())
                .toList())
            .recentExceptions(governanceExceptionRepository.findTop12ByOrderByTriggeredAtDesc().stream()
                .map(event -> SystemMonitorResponse.ExceptionEvent.builder()
                    .title(event.getTitle())
                    .moduleName(event.getModuleName())
                    .riskLevel(event.getRiskLevel())
                    .status(event.getStatus().name())
                    .summary(event.getSummary())
                    .triggeredAt(event.getTriggeredAt())
                    .build())
                .toList())
            .build();
    }

    @Transactional(readOnly = true)
    public List<FraudControlRuleResponse> listFraudRules(UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.VIEW_SYSTEM_MONITOR);
        return fraudControlRuleRepository.findAllByOrderByModuleScopeAscRuleNameAsc().stream()
            .map(this::toFraudRuleResponse)
            .toList();
    }

    @Transactional
    public List<FraudControlRuleResponse> saveFraudRules(List<FraudRuleUpsertRequest> requests, UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.MANAGE_EXCEPTION_RULES);
        List<FraudControlRuleEntity> saved = new ArrayList<>();
        for (FraudRuleUpsertRequest request : requests == null ? List.<FraudRuleUpsertRequest>of() : requests) {
            FraudControlRuleEntity entity = request.id() != null
                ? fraudControlRuleRepository.findById(request.id())
                    .orElseThrow(() -> new ResourceNotFoundException("Fraud rule not found: " + request.id()))
                : fraudControlRuleRepository.findByRuleCode(normalizeCode(request.ruleCode()))
                    .orElse(FraudControlRuleEntity.builder().build());

            entity.setRuleCode(normalizeCode(request.ruleCode()));
            entity.setRuleName(required(request.ruleName(), "Rule name is required"));
            entity.setModuleScope(required(request.moduleScope(), "Module scope is required").toUpperCase());
            entity.setRiskLevel(required(request.riskLevel(), "Risk level is required").toUpperCase());
            entity.setThresholdValue(request.thresholdValue());
            entity.setThresholdUnit(normalize(request.thresholdUnit()));
            entity.setEnabled(request.enabled());
            entity.setAutoCreateException(request.autoCreateException());
            entity.setEscalationRoles(joinRoles(request.escalationRoles()));
            saved.add(fraudControlRuleRepository.save(entity));
        }

        logAction(
            currentUser,
            "GOVERNANCE",
            "FRAUD_RULES_UPDATED",
            "FRAUD_RULE",
            null,
            "Updated fraud-control rules",
            "count=" + saved.size());

        return fraudControlRuleRepository.findAllByOrderByModuleScopeAscRuleNameAsc().stream()
            .map(this::toFraudRuleResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<GovernanceExceptionResponse> listExceptions(String status, String riskLevel, UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.VIEW_SYSTEM_MONITOR);
        GovernanceExceptionEntity.Status normalizedStatus = normalizeExceptionStatus(status);
        String normalizedRisk = normalizeUpper(riskLevel);
        return governanceExceptionRepository.findByFilters(normalizedStatus, normalizedRisk).stream()
            .map(this::toExceptionResponse)
            .toList();
    }

    @Transactional
    public GovernanceExceptionResponse escalateException(UUID id, String note, UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.RESOLVE_EXCEPTIONS);
        GovernanceExceptionEntity entity = governanceExceptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Governance exception not found: " + id));
        entity.setStatus(GovernanceExceptionEntity.Status.ESCALATED);
        entity.setResolutionNote(normalize(note));
        entity.setAssignedTo(currentUser);
        GovernanceExceptionEntity saved = governanceExceptionRepository.save(entity);

        logAction(
            currentUser,
            "GOVERNANCE",
            "EXCEPTION_ESCALATED",
            "GOVERNANCE_EXCEPTION",
            saved.getId(),
            "Escalated governance exception " + saved.getTitle(),
            normalize(note));

        notifyUsers(
            resolveEscalationRecipients(saved.getRule()),
            "GOVERNANCE_EXCEPTION",
            "Governance exception escalated",
            saved.getTitle() + " was escalated for review",
            "/exceptions",
            "GOVERNANCE_EXCEPTION",
            saved.getId());

        return toExceptionResponse(saved);
    }

    @Transactional
    public GovernanceExceptionResponse resolveException(UUID id, ExceptionResolutionRequest request, UserEntity currentUser) {
        requirePermission(currentUser, PermissionKey.RESOLVE_EXCEPTIONS);
        GovernanceExceptionEntity entity = governanceExceptionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Governance exception not found: " + id));
        GovernanceExceptionEntity.Status targetStatus = request != null && request.dismissed()
            ? GovernanceExceptionEntity.Status.DISMISSED
            : GovernanceExceptionEntity.Status.RESOLVED;
        entity.setStatus(targetStatus);
        entity.setResolutionNote(request != null ? normalize(request.note()) : null);
        entity.setResolvedAt(LocalDateTime.now());
        entity.setAssignedTo(currentUser);
        GovernanceExceptionEntity saved = governanceExceptionRepository.save(entity);

        logAction(
            currentUser,
            "GOVERNANCE",
            targetStatus == GovernanceExceptionEntity.Status.RESOLVED ? "EXCEPTION_RESOLVED" : "EXCEPTION_DISMISSED",
            "GOVERNANCE_EXCEPTION",
            saved.getId(),
            (targetStatus == GovernanceExceptionEntity.Status.RESOLVED ? "Resolved " : "Dismissed ") + saved.getTitle(),
            saved.getResolutionNote());

        return toExceptionResponse(saved);
    }

    @Transactional
    public void triggerRuleException(
        String ruleCode,
        java.math.BigDecimal observedValue,
        UserEntity actor,
        String moduleName,
        String entityType,
        UUID entityId,
        String title,
        String summary,
        String details
    ) {
        FraudControlRuleEntity rule = fraudControlRuleRepository.findByRuleCode(normalizeCode(ruleCode)).orElse(null);
        if (rule == null || !rule.isEnabled() || !rule.isAutoCreateException()) {
            return;
        }
        if (rule.getThresholdValue() != null && observedValue != null && observedValue.compareTo(rule.getThresholdValue()) < 0) {
            return;
        }
        GovernanceExceptionEntity entity = governanceExceptionRepository.save(GovernanceExceptionEntity.builder()
            .rule(rule)
            .title(title)
            .moduleName(moduleName)
            .entityType(entityType)
            .entityId(entityId)
            .riskLevel(rule.getRiskLevel())
            .status(GovernanceExceptionEntity.Status.OPEN)
            .summary(summary)
            .details(details)
            .triggeredBy(actor)
            .build());

        logAction(
            actor,
            "GOVERNANCE",
            "RULE_EXCEPTION_TRIGGERED",
            "GOVERNANCE_EXCEPTION",
            entity.getId(),
            "Triggered " + rule.getRuleName(),
            summary);

        notifyUsers(
            resolveEscalationRecipients(rule),
            "GOVERNANCE_EXCEPTION",
            title,
            summary,
            "/exceptions",
            "GOVERNANCE_EXCEPTION",
            entity.getId());
    }

    @Transactional(readOnly = true)
    public List<UserEntity> getApprovedUsersByRoles(List<UserEntity.Role> roles) {
        return userRepository.findByRoleInAndStatusAndActiveTrue(roles, UserEntity.Status.APPROVED);
    }

    @Transactional(readOnly = true)
    public List<UserEntity> getApprovedUsersForBranch(UUID branchId) {
        return userRepository.findByBranch_IdAndStatusAndActiveTrue(branchId, UserEntity.Status.APPROVED);
    }

    @Transactional(readOnly = true)
    public boolean hasPermission(UserEntity user, PermissionKey key) {
        if (user == null) {
            return false;
        }
        UserPermissionOverrideEntity override = userPermissionOverrideRepository
            .findByUser_IdAndPermissionKey(user.getId(), key.name())
            .orElse(null);
        if (override != null) {
            return override.isEnabled();
        }
        return defaultPermissionsFor(user.getRole()).contains(key);
    }

    public void requirePermission(UserEntity user, PermissionKey key) {
        if (!hasPermission(user, key)) {
            throw new AccessDeniedException("Missing permission: " + key.name());
        }
    }

    private PermissionMatrixResponse buildPermissionMatrix(UserEntity target) {
        Set<PermissionKey> defaults = defaultPermissionsFor(target.getRole());
        Map<String, UserPermissionOverrideEntity> overrides = new LinkedHashMap<>();
        for (UserPermissionOverrideEntity override : userPermissionOverrideRepository.findByUser_IdOrderByPermissionKeyAsc(target.getId())) {
            overrides.put(override.getPermissionKey(), override);
        }

        List<PermissionMatrixResponse.PermissionEntry> permissions = new ArrayList<>();
        for (PermissionKey key : PermissionKey.values()) {
            boolean defaultEnabled = defaults.contains(key);
            UserPermissionOverrideEntity override = overrides.get(key.name());
            boolean enabled = override != null ? override.isEnabled() : defaultEnabled;
            permissions.add(PermissionMatrixResponse.PermissionEntry.builder()
                .key(key.name())
                .label(key.label)
                .description(key.description)
                .enabled(enabled)
                .defaultEnabled(defaultEnabled)
                .source(override != null ? "OVERRIDE" : "ROLE_DEFAULT")
                .build());
        }

        return PermissionMatrixResponse.builder()
            .userId(target.getId())
            .userName(target.getName())
            .userEmail(target.getEmail())
            .role(target.getRole().name())
            .branchName(target.getBranch() != null ? target.getBranch().getName() : null)
            .permissions(permissions)
            .generatedAt(LocalDateTime.now())
            .build();
    }

    private void assertCanManagePermissionsFor(UserEntity actor, UserEntity target) {
        if (actor.isAdmin()) {
            return;
        }
        if (!actor.isWarehouseAdmin()) {
            throw new AccessDeniedException("You do not have permission to manage this user's permissions");
        }
        if (target.getRole() == UserEntity.Role.ADMIN || target.getRole() == UserEntity.Role.WAREHOUSE_ADMIN) {
            throw new AccessDeniedException("Warehouse admin cannot manage admin or warehouse admin permissions");
        }
    }

    private Set<PermissionKey> defaultPermissionsFor(UserEntity.Role role) {
        return DEFAULT_PERMISSIONS.getOrDefault(role, Set.of());
    }

    private AppNotificationResponse toNotificationResponse(AppNotificationEntity notification) {
        return AppNotificationResponse.builder()
            .id(notification.getId())
            .notificationType(notification.getNotificationType())
            .title(notification.getTitle())
            .message(notification.getMessage())
            .actionUrl(notification.getActionUrl())
            .relatedEntityType(notification.getRelatedEntityType())
            .relatedEntityId(notification.getRelatedEntityId())
            .read(notification.isRead())
            .createdAt(notification.getCreatedAt())
            .readAt(notification.getReadAt())
            .build();
    }

    private AuditLogResponse toAuditResponse(AuditLogEntity auditLog) {
        return AuditLogResponse.builder()
            .id(auditLog.getId())
            .actorName(auditLog.getActorName())
            .actorRole(auditLog.getActorRole())
            .moduleName(auditLog.getModuleName())
            .actionType(auditLog.getActionType())
            .entityType(auditLog.getEntityType())
            .entityId(auditLog.getEntityId())
            .summary(auditLog.getSummary())
            .details(auditLog.getDetails())
            .createdAt(auditLog.getCreatedAt())
            .build();
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeUpper(String value) {
        String normalized = normalize(value);
        return normalized != null ? normalized.toUpperCase() : null;
    }

    private String normalizeCode(String value) {
        String normalized = required(value, "Rule code is required");
        return normalized.trim().toUpperCase().replace(' ', '_');
    }

    private String required(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private String joinRoles(List<String> escalationRoles) {
        if (escalationRoles == null || escalationRoles.isEmpty()) {
            return "ADMIN,WAREHOUSE_ADMIN";
        }
        return escalationRoles.stream()
            .map(role -> role == null ? null : role.trim().toUpperCase())
            .filter(role -> role != null && !role.isBlank())
            .distinct()
            .reduce((a, b) -> a + "," + b)
            .orElse("ADMIN,WAREHOUSE_ADMIN");
    }

    private GovernanceExceptionEntity.Status normalizeExceptionStatus(String status) {
        String normalized = normalizeUpper(status);
        return normalized != null ? GovernanceExceptionEntity.Status.valueOf(normalized) : null;
    }

    private List<UserEntity> resolveEscalationRecipients(FraudControlRuleEntity rule) {
        String rawRoles = rule != null ? normalize(rule.getEscalationRoles()) : null;
        List<UserEntity.Role> roles = rawRoles == null
            ? List.of(UserEntity.Role.ADMIN, UserEntity.Role.WAREHOUSE_ADMIN)
            : Arrays.stream(rawRoles.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(String::toUpperCase)
                .map(UserEntity.Role::valueOf)
                .distinct()
                .toList();
        return getApprovedUsersByRoles(roles);
    }

    private FraudControlRuleResponse toFraudRuleResponse(FraudControlRuleEntity entity) {
        return FraudControlRuleResponse.builder()
            .id(entity.getId())
            .ruleCode(entity.getRuleCode())
            .ruleName(entity.getRuleName())
            .moduleScope(entity.getModuleScope())
            .riskLevel(entity.getRiskLevel())
            .thresholdValue(entity.getThresholdValue())
            .thresholdUnit(entity.getThresholdUnit())
            .enabled(entity.isEnabled())
            .autoCreateException(entity.isAutoCreateException())
            .escalationRoles(entity.getEscalationRoles() == null ? List.of() : Arrays.stream(entity.getEscalationRoles().split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList())
            .updatedAt(entity.getUpdatedAt())
            .build();
    }

    private GovernanceExceptionResponse toExceptionResponse(GovernanceExceptionEntity entity) {
        return GovernanceExceptionResponse.builder()
            .id(entity.getId())
            .ruleId(entity.getRule() != null ? entity.getRule().getId() : null)
            .ruleCode(entity.getRule() != null ? entity.getRule().getRuleCode() : null)
            .ruleName(entity.getRule() != null ? entity.getRule().getRuleName() : null)
            .title(entity.getTitle())
            .moduleName(entity.getModuleName())
            .entityType(entity.getEntityType())
            .entityId(entity.getEntityId())
            .riskLevel(entity.getRiskLevel())
            .status(entity.getStatus().name())
            .summary(entity.getSummary())
            .details(entity.getDetails())
            .triggeredByName(entity.getTriggeredBy() != null ? entity.getTriggeredBy().getName() : null)
            .assignedToName(entity.getAssignedTo() != null ? entity.getAssignedTo().getName() : null)
            .triggeredAt(entity.getTriggeredAt())
            .resolvedAt(entity.getResolvedAt())
            .resolutionNote(entity.getResolutionNote())
            .build();
    }

    public enum PermissionKey {
        VIEW_AUDIT("View Audit Trail", "Review governance and operational audit activity."),
        VIEW_SYSTEM_MONITOR("View System Monitor", "Access live admin health and exception dashboards."),
        MANAGE_USERS("Manage Users", "Edit users, branches, activation, and direct user creation."),
        APPROVE_USERS("Approve Users", "Approve or reject new account registrations."),
        MANAGE_PERMISSIONS("Manage Permissions", "Set per-user permission overrides on top of role defaults."),
        MANAGE_EXCEPTION_RULES("Manage Exception Rules", "Configure fraud-control rules, thresholds, and escalation roles."),
        RESOLVE_EXCEPTIONS("Resolve Exceptions", "Escalate, dismiss, or resolve governance exceptions."),
        VIEW_FEEDBACK("View Feedback", "Review branch and staff feedback items."),
        USE_IMPERSONATION("Use Impersonation", "Start scoped impersonation sessions for support and verification.");

        private final String label;
        private final String description;

        PermissionKey(String label, String description) {
            this.label = label;
            this.description = description;
        }
    }

    public record PermissionOverrideRequest(String key, boolean enabled) {}
    public record FraudRuleUpsertRequest(
        UUID id,
        String ruleCode,
        String ruleName,
        String moduleScope,
        String riskLevel,
        java.math.BigDecimal thresholdValue,
        String thresholdUnit,
        boolean enabled,
        boolean autoCreateException,
        List<String> escalationRoles
    ) {}
    public record ExceptionResolutionRequest(String note, boolean dismissed) {}

    private enum UserEntityIndentStatus {
        SUBMITTED(com.vbworld.api.infrastructure.entity.IndentEntity.Status.SUBMITTED);
        private final com.vbworld.api.infrastructure.entity.IndentEntity.Status status;
        UserEntityIndentStatus(com.vbworld.api.infrastructure.entity.IndentEntity.Status status) {
            this.status = status;
        }
    }
}
