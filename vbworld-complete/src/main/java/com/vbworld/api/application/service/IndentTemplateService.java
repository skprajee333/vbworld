package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.IndentTemplateEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.IndentTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndentTemplateService {

    private final IndentTemplateRepository templateRepository;
    private final BranchRepository         branchRepository;

    // ─── LIST templates for a branch ─────────────────────────
    @Transactional(readOnly = true)
    public List<TemplateResponse> listTemplates(UUID branchId) {
        return templateRepository
            .findByBranch_IdOrderByUseCountDescCreatedAtDesc(branchId)
            .stream()
            .map(this::toResponse)
            .toList();
    }

    // ─── GET single template ──────────────────────────────────
    @Transactional(readOnly = true)
    public TemplateResponse getTemplate(UUID id, UUID branchId) {
        return toResponse(findOrThrow(id, branchId));
    }

    // ─── SAVE new template ────────────────────────────────────
    @Transactional
    public TemplateResponse saveTemplate(
        UUID branchId, String name, String description,
        List<Map<String, Object>> items, UserEntity user
    ) {
        if (name == null || name.isBlank())
            throw new BusinessException("Template name is required");
        if (items == null || items.isEmpty())
            throw new BusinessException("Template must have at least one item");

        var branch = branchRepository.findById(branchId)
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found"));

        var template = IndentTemplateEntity.builder()
            .branch(branch)
            .createdBy(user)
            .name(name.trim())
            .description(description)
            .items(items)
            .build();

        var saved = templateRepository.save(template);
        log.info("Template '{}' saved for branch {}", name, branch.getName());
        return toResponse(saved);
    }

    // ─── UPDATE existing template ─────────────────────────────
    @Transactional
    public TemplateResponse updateTemplate(
        UUID id, UUID branchId, String name, String description,
        List<Map<String, Object>> items, UserEntity user
    ) {
        var template = findOrThrow(id, branchId);

        if (name != null && !name.isBlank()) template.setName(name.trim());
        if (description != null)              template.setDescription(description);
        if (items != null && !items.isEmpty()) template.setItems(items);

        return toResponse(templateRepository.save(template));
    }

    // ─── USE template (increments use count) ─────────────────
    @Transactional
    public TemplateResponse useTemplate(UUID id, UUID branchId) {
        findOrThrow(id, branchId); // validate exists
        templateRepository.incrementUseCount(id, LocalDateTime.now());
        return getTemplate(id, branchId);
    }

    // ─── DELETE template ──────────────────────────────────────
    @Transactional
    public void deleteTemplate(UUID id, UUID branchId) {
        var template = findOrThrow(id, branchId);
        templateRepository.delete(template);
        log.info("Template '{}' deleted", template.getName());
    }

    // ─── HELPERS ─────────────────────────────────────────────
    private IndentTemplateEntity findOrThrow(UUID id, UUID branchId) {
        return templateRepository.findByIdAndBranch_Id(id, branchId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Template not found: " + id));
    }

    private TemplateResponse toResponse(IndentTemplateEntity e) {
        return new TemplateResponse(
            e.getId(), e.getName(), e.getDescription(),
            e.getItems(), e.getUseCount(), e.getLastUsedAt(),
            e.getCreatedBy().getName(), e.getCreatedAt()
        );
    }

    // ─── DTO ─────────────────────────────────────────────────
    public record TemplateResponse(
        UUID id,
        String name,
        String description,
        List<Map<String, Object>> items,
        int useCount,
        LocalDateTime lastUsedAt,
        String createdByName,
        LocalDateTime createdAt
    ) {}
}
