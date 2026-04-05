package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.*;
import com.vbworld.api.infrastructure.entity.*;
import com.vbworld.api.infrastructure.repository.*;
import com.vbworld.api.presentation.dto.request.IndentRequest;
import com.vbworld.api.presentation.dto.response.IndentResponse;
import com.vbworld.api.presentation.dto.response.PagedResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IndentService {

    private final IndentRepository         indentRepository;
    private final ItemRepository           itemRepository;
    private final BranchRepository         branchRepository;
    private final UserRepository           userRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final GovernanceService        governanceService;

    @Transactional(readOnly = true)
    public PagedResponse<IndentResponse> listIndents(
        UUID branchId, String status, String from, String to,
        int page, int size, UserEntity currentUser
    ) {
        UUID effectiveBranchId = branchId;
        if (currentUser.getRole() == UserEntity.Role.RESTAURANT_STAFF) {
            effectiveBranchId = currentUser.getBranch() != null
                ? currentUser.getBranch().getId() : null;
        }

        IndentEntity.Status statusEnum = null;
        if (status != null && !status.isBlank()) {
            try { statusEnum = IndentEntity.Status.valueOf(status.toUpperCase()); }
            catch (IllegalArgumentException e) {
                throw new BusinessException("Invalid status: " + status);
            }
        }

        LocalDateTime fromDate = from != null ? LocalDateTime.parse(from + "T00:00:00") : null;
        LocalDateTime toDate   = to   != null ? LocalDateTime.parse(to   + "T23:59:59") : null;

        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result   = indentRepository.findAll(
            withFilters(effectiveBranchId, statusEnum, fromDate, toDate), pageable);

        return PagedResponse.from(result.map(this::toListResponse));
    }

    @Transactional(readOnly = true)
    public IndentResponse getIndent(UUID id, UserEntity currentUser) {
        IndentEntity indent = findIndentOrThrow(id);
        if (currentUser.getRole() == UserEntity.Role.RESTAURANT_STAFF
            && !indent.getBranch().getId().equals(
                currentUser.getBranch() != null ? currentUser.getBranch().getId() : null)) {
            throw new AccessDeniedException("Access denied");
        }
        return toDetailResponse(indent);
    }

    @Transactional(readOnly = true)
    public IndentResponse getIndentForReorder(UUID id, UserEntity currentUser) {
        IndentEntity indent = findIndentOrThrow(id);
        if (currentUser.getRole() == UserEntity.Role.RESTAURANT_STAFF
            && currentUser.getBranch() != null
            && !indent.getBranch().getId().equals(currentUser.getBranch().getId())) {
            throw new AccessDeniedException("Access denied");
        }
        return toDetailResponse(indent);
    }

    @Transactional
    public IndentResponse createIndent(IndentRequest.Create req, UserEntity currentUser) {
        UUID branchId = req.getBranchId() != null
            ? req.getBranchId()
            : (currentUser.getBranch() != null ? currentUser.getBranch().getId() : null);

        if (branchId == null) throw new BusinessException("Branch is required");

        BranchEntity branch = branchRepository.findById(branchId)
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + branchId));

        IndentEntity.DeliverySlot requestedSlot = parseDeliverySlot(req.getRequestedDeliverySlot());
        LocalDate minimumDate = calculateMinimumDeliveryDate(branch);
        LocalDate scheduledDate = req.getExpectedDate() != null ? req.getExpectedDate() : minimumDate;
        if (scheduledDate.isBefore(minimumDate)) {
            throw new BusinessException("Selected delivery date is before the branch cutoff window");
        }
        boolean cutoffApplied = minimumDate.isAfter(LocalDate.now().plusDays(branch.getOrderLeadDays() != null ? branch.getOrderLeadDays() : 1));
        IndentEntity.DeliverySlot promisedSlot = requestedSlot != null ? requestedSlot : defaultSlot(branch);
        validateSlotCapacity(branch, scheduledDate, promisedSlot);

        IndentEntity indent = IndentEntity.builder()
            .branch(branch).createdBy(currentUser)
            .status(IndentEntity.Status.SUBMITTED)
            .expectedDate(scheduledDate)
            .scheduledDeliveryDate(scheduledDate)
            .requestedDeliverySlot(promisedSlot)
            .promisedDeliverySlot(promisedSlot)
            .cutoffApplied(cutoffApplied)
            .notes(req.getNotes())
            .build();

        for (IndentRequest.LineItem lineItem : req.getItems()) {
            ItemEntity item = itemRepository.findById(lineItem.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Item not found: " + lineItem.getItemId()));
            indent.addItem(IndentItemEntity.builder()
                .item(item).requestedQty(lineItem.getQuantity())
                .unit(item.getUnit()).notes(lineItem.getNotes()).build());
        }

        IndentEntity saved = indentRepository.save(indent);
        governanceService.logAction(
            currentUser,
            "INDENTS",
            "INDENT_CREATED",
            "INDENT",
            saved.getId(),
            "Created indent " + saved.getIndentNumber(),
            "Branch: " + branch.getName() + ", items: " + saved.getItems().size());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(
                UserEntity.Role.ADMIN,
                UserEntity.Role.WAREHOUSE_ADMIN,
                UserEntity.Role.WAREHOUSE_MANAGER)),
            "INDENT",
            "New indent submitted",
            branch.getName() + " submitted " + saved.getIndentNumber(),
            "/orders",
            "INDENT",
            saved.getId());
        log.info("Indent created: {} by {}", saved.getIndentNumber(), currentUser.getEmail());
        return toDetailResponse(saved);
    }

    @Transactional
    public IndentResponse approveIndent(UUID id, IndentRequest.Approve req, UserEntity approver) {
        IndentEntity indent = findIndentOrThrow(id);
        if (indent.getStatus() != IndentEntity.Status.SUBMITTED)
            throw new BusinessException("Only SUBMITTED indents can be approved");

        if (req.getItems() != null && !req.getItems().isEmpty()) {
            for (IndentRequest.ApproveItem ai : req.getItems()) {
                indent.getItems().stream()
                    .filter(ii -> ii.getItem().getId().equals(ai.getItemId()))
                    .findFirst().ifPresent(ii -> ii.setApprovedQty(ai.getApprovedQty()));
            }
        } else {
            indent.getItems().forEach(ii -> ii.setApprovedQty(ii.getRequestedQty()));
        }

        indent.setStatus(IndentEntity.Status.APPROVED);
        indent.setApprovedBy(approver);
        indent.setApprovedAt(LocalDateTime.now());
        IndentEntity saved = indentRepository.save(indent);
        governanceService.logAction(
            approver,
            "INDENTS",
            "INDENT_APPROVED",
            "INDENT",
            saved.getId(),
            "Approved indent " + saved.getIndentNumber(),
            "Branch: " + saved.getBranch().getName());
        governanceService.notifyUsers(
            List.of(saved.getCreatedBy()),
            "INDENT",
            "Indent approved",
            saved.getIndentNumber() + " has been approved",
            "/history",
            "INDENT",
            saved.getId());
        log.info("Indent approved: {} by {}", saved.getIndentNumber(), approver.getEmail());
        return toDetailResponse(saved);
    }

    @Transactional
    public IndentResponse dispatchIndent(UUID id, UserEntity dispatcher) {
        IndentEntity indent = findIndentOrThrow(id);
        if (indent.getStatus() != IndentEntity.Status.APPROVED)
            throw new BusinessException("Only APPROVED indents can be dispatched");

        for (IndentItemEntity item : indent.getItems()) {
            BigDecimal debitQty = item.getApprovedQty() != null
                ? item.getApprovedQty() : item.getRequestedQty();
            WarehouseStockEntity stock = warehouseStockRepository
                .findByItem_Id(item.getItem().getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "No warehouse stock for: " + item.getItem().getName()));
            if (stock.getQuantity().compareTo(debitQty) < 0)
                throw new InsufficientStockException(
                    "Insufficient stock for: " + item.getItem().getName());
            stock.setQuantity(stock.getQuantity().subtract(debitQty));
            stock.setLastUpdatedAt(LocalDateTime.now());
            stock.setUpdatedBy(dispatcher);
            warehouseStockRepository.save(stock);
        }

        indent.setStatus(IndentEntity.Status.DISPATCHED);
        indent.setDispatchedBy(dispatcher);
        indent.setDispatchedAt(LocalDateTime.now());
        IndentEntity saved = indentRepository.save(indent);
        governanceService.logAction(
            dispatcher,
            "INDENTS",
            "INDENT_DISPATCHED",
            "INDENT",
            saved.getId(),
            "Dispatched indent " + saved.getIndentNumber(),
            "Branch: " + saved.getBranch().getName());
        governanceService.notifyUsers(
            List.of(saved.getCreatedBy()),
            "INDENT",
            "Indent dispatched",
            saved.getIndentNumber() + " is now in transit",
            "/history",
            "INDENT",
            saved.getId());
        log.info("Indent dispatched: {}", saved.getIndentNumber());
        return toDetailResponse(saved);
    }

    @Transactional
    public IndentResponse deliverIndent(UUID id, IndentRequest.Deliver req, UserEntity receiver) {
        IndentEntity indent = findIndentOrThrow(id);
        if (indent.getStatus() != IndentEntity.Status.DISPATCHED)
            throw new BusinessException("Only DISPATCHED indents can be delivered");

        for (IndentItemEntity item : indent.getItems()) {
            BigDecimal deliveredQty;
            if (req != null && req.getItems() != null) {
                deliveredQty = req.getItems().stream()
                    .filter(d -> d.getItemId().equals(item.getItem().getId()))
                    .map(IndentRequest.DeliverItem::getDeliveredQty)
                    .findFirst()
                    .orElse(item.getApprovedQty() != null
                        ? item.getApprovedQty() : item.getRequestedQty());
            } else {
                deliveredQty = item.getApprovedQty() != null
                    ? item.getApprovedQty() : item.getRequestedQty();
            }
            item.setDeliveredQty(deliveredQty);
        }

        indent.setStatus(IndentEntity.Status.DELIVERED);
        indent.setDeliveredBy(receiver);
        indent.setDeliveredAt(LocalDateTime.now());
        IndentEntity saved = indentRepository.save(indent);
        governanceService.logAction(
            receiver,
            "INDENTS",
            "INDENT_DELIVERED",
            "INDENT",
            saved.getId(),
            "Delivered indent " + saved.getIndentNumber(),
            "Branch: " + saved.getBranch().getName());
        governanceService.notifyUsers(
            List.of(saved.getCreatedBy()),
            "INDENT",
            "Indent delivered",
            saved.getIndentNumber() + " has been marked delivered",
            "/history",
            "INDENT",
            saved.getId());
        log.info("Indent delivered: {}", saved.getIndentNumber());
        return toDetailResponse(saved);
    }

    @Transactional
    public void cancelIndent(UUID id, IndentRequest.Cancel req, UserEntity user) {
        IndentEntity indent = findIndentOrThrow(id);
        if (indent.getStatus() != IndentEntity.Status.DRAFT
            && indent.getStatus() != IndentEntity.Status.SUBMITTED)
            throw new BusinessException("Only DRAFT or SUBMITTED indents can be cancelled");

        if (user.getRole() == UserEntity.Role.RESTAURANT_STAFF
            && user.getBranch() != null
            && !indent.getBranch().getId().equals(user.getBranch().getId()))
            throw new BusinessException("You can only cancel your own branch indents");

        indent.setStatus(IndentEntity.Status.CANCELLED);
        indent.setCancelReason(req.getReason());
        indent.setCancelledAt(LocalDateTime.now());
        indentRepository.save(indent);
        governanceService.logAction(
            user,
            "INDENTS",
            "INDENT_CANCELLED",
            "INDENT",
            indent.getId(),
            "Cancelled indent " + indent.getIndentNumber(),
            "Reason: " + req.getReason());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(
                UserEntity.Role.ADMIN,
                UserEntity.Role.WAREHOUSE_ADMIN,
                UserEntity.Role.WAREHOUSE_MANAGER)),
            "INDENT",
            "Indent cancelled",
            indent.getIndentNumber() + " was cancelled by " + user.getName(),
            "/orders",
            "INDENT",
            indent.getId());
        log.info("Indent cancelled: {}", indent.getIndentNumber());
    }

    @Transactional(readOnly = true)
    public List<RoutePlanItem> getRoutePlan(LocalDate date, UserEntity currentUser) {
        if (!(currentUser.isWarehouse() || currentUser.isAdmin())) {
            throw new AccessDeniedException("You do not have permission to view route planning");
        }
        return indentRepository.findByScheduledDeliveryDateAndStatusInOrderByPromisedDeliverySlotAscCreatedAtAsc(
                date,
                List.of(IndentEntity.Status.SUBMITTED, IndentEntity.Status.APPROVED, IndentEntity.Status.DISPATCHED)
            ).stream()
            .map(indent -> RoutePlanItem.builder()
                .id(indent.getId())
                .indentNumber(indent.getIndentNumber())
                .branchId(indent.getBranch().getId())
                .branchName(indent.getBranch().getName())
                .status(indent.getStatus().name())
                .scheduledDate(indent.getScheduledDeliveryDate())
                .requestedSlot(indent.getRequestedDeliverySlot() != null ? indent.getRequestedDeliverySlot().name() : null)
                .promisedSlot(indent.getPromisedDeliverySlot() != null ? indent.getPromisedDeliverySlot().name() : null)
                .itemCount(indent.getItems().size())
                .cutoffApplied(indent.isCutoffApplied())
                .notes(indent.getNotes())
                .createdAt(indent.getCreatedAt())
                .build())
            .toList();
    }

    @Transactional
    public IndentResponse rescheduleIndent(UUID id, IndentRequest.Reschedule req, UserEntity actor) {
        if (!(actor.isWarehouseAdmin() || actor.isAdmin())) {
            throw new AccessDeniedException("Only warehouse admin or admin can reschedule orders");
        }

        IndentEntity indent = findIndentOrThrow(id);
        if (indent.getStatus() == IndentEntity.Status.DELIVERED || indent.getStatus() == IndentEntity.Status.CANCELLED) {
            throw new BusinessException("Delivered or cancelled indents cannot be rescheduled");
        }

        BranchEntity branch = indent.getBranch();
        IndentEntity.DeliverySlot newSlot = parseDeliverySlot(req.getDeliverySlot());
        if (newSlot == null) {
            throw new BusinessException("Delivery slot is required");
        }

        LocalDate minimumDate = calculateMinimumDeliveryDate(branch);
        if (req.getScheduledDate().isBefore(minimumDate)) {
            throw new BusinessException("Selected delivery date is before the branch cutoff window");
        }

        validateSlotCapacity(branch, req.getScheduledDate(), newSlot, indent.getId());

        indent.setExpectedDate(req.getScheduledDate());
        indent.setScheduledDeliveryDate(req.getScheduledDate());
        indent.setPromisedDeliverySlot(newSlot);
        if (indent.getRequestedDeliverySlot() == null) {
            indent.setRequestedDeliverySlot(newSlot);
        }

        IndentEntity saved = indentRepository.save(indent);
        governanceService.logAction(
            actor,
            "INDENTS",
            "INDENT_RESCHEDULED",
            "INDENT",
            saved.getId(),
            "Rescheduled indent " + saved.getIndentNumber(),
            "date=" + req.getScheduledDate() + ", slot=" + newSlot.name() + ", reason=" + req.getReason()
        );
        governanceService.notifyUsers(
            List.of(saved.getCreatedBy()),
            "INDENT",
            "Delivery slot updated",
            saved.getIndentNumber() + " was rescheduled to " + req.getScheduledDate() + " (" + newSlot.name() + ")",
            "/history",
            "INDENT",
            saved.getId()
        );
        return toDetailResponse(saved);
    }

    private IndentResponse toListResponse(IndentEntity e) {
        return IndentResponse.builder()
            .id(e.getId()).indentNumber(e.getIndentNumber())
            .branchName(e.getBranch().getName()).branchId(e.getBranch().getId())
            .createdByName(e.getCreatedBy().getName())
            .status(e.getStatus().name()).expectedDate(e.getExpectedDate())
            .scheduledDeliveryDate(e.getScheduledDeliveryDate())
            .requestedDeliverySlot(e.getRequestedDeliverySlot() != null ? e.getRequestedDeliverySlot().name() : null)
            .promisedDeliverySlot(e.getPromisedDeliverySlot() != null ? e.getPromisedDeliverySlot().name() : null)
            .cutoffApplied(e.isCutoffApplied())
            .notes(e.getNotes()).approvedAt(e.getApprovedAt())
            .dispatchedAt(e.getDispatchedAt()).deliveredAt(e.getDeliveredAt())
            .cancelledAt(e.getCancelledAt()).cancelReason(e.getCancelReason())
            .createdAt(e.getCreatedAt()).itemCount(e.getItems().size())
            .build();
    }

    private IndentResponse toDetailResponse(IndentEntity e) {
        List<IndentResponse.IndentItemResponse> items = e.getItems().stream()
            .map(ii -> IndentResponse.IndentItemResponse.builder()
                .id(ii.getId()).itemId(ii.getItem().getId())
                .itemName(ii.getItem().getName()).itemCode(ii.getItem().getCode())
                .category(ii.getItem().getCategory() != null
                    ? ii.getItem().getCategory().getName() : null)
                .requestedQty(ii.getRequestedQty()).approvedQty(ii.getApprovedQty())
                .deliveredQty(ii.getDeliveredQty()).unit(ii.getUnit()).notes(ii.getNotes())
                .build())
            .toList();

        return IndentResponse.builder()
            .id(e.getId()).indentNumber(e.getIndentNumber())
            .branchName(e.getBranch().getName()).branchId(e.getBranch().getId())
            .createdByName(e.getCreatedBy().getName())
            .status(e.getStatus().name()).expectedDate(e.getExpectedDate())
            .scheduledDeliveryDate(e.getScheduledDeliveryDate())
            .requestedDeliverySlot(e.getRequestedDeliverySlot() != null ? e.getRequestedDeliverySlot().name() : null)
            .promisedDeliverySlot(e.getPromisedDeliverySlot() != null ? e.getPromisedDeliverySlot().name() : null)
            .cutoffApplied(e.isCutoffApplied())
            .notes(e.getNotes())
            .approvedByName(e.getApprovedBy() != null ? e.getApprovedBy().getName() : null)
            .approvedAt(e.getApprovedAt())
            .dispatchedByName(e.getDispatchedBy() != null ? e.getDispatchedBy().getName() : null)
            .dispatchedAt(e.getDispatchedAt()).deliveredAt(e.getDeliveredAt())
            .cancelledAt(e.getCancelledAt()).cancelReason(e.getCancelReason())
            .createdAt(e.getCreatedAt()).itemCount(items.size()).items(items)
            .build();
    }

    private IndentEntity findIndentOrThrow(UUID id) {
        return indentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Indent not found: " + id));
    }

    private Specification<IndentEntity> withFilters(
        UUID branchId,
        IndentEntity.Status status,
        LocalDateTime fromDate,
        LocalDateTime toDate
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();

            if (branchId != null) {
                predicates.add(cb.equal(root.get("branch").get("id"), branchId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
            }
            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDate));
            }

            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private IndentEntity.DeliverySlot parseDeliverySlot(String requestedDeliverySlot) {
        if (requestedDeliverySlot == null || requestedDeliverySlot.isBlank()) {
            return null;
        }
        try {
            return IndentEntity.DeliverySlot.valueOf(requestedDeliverySlot.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Invalid delivery slot: " + requestedDeliverySlot);
        }
    }

    private LocalDate calculateMinimumDeliveryDate(BranchEntity branch) {
        int leadDays = branch.getOrderLeadDays() != null ? branch.getOrderLeadDays() : 1;
        LocalDate minimum = LocalDate.now().plusDays(leadDays);
        LocalTime cutoff = branch.getOrderCutoffTime() != null ? branch.getOrderCutoffTime() : LocalTime.of(17, 0);
        if (!LocalTime.now().isBefore(cutoff)) {
            minimum = minimum.plusDays(1);
        }
        return minimum;
    }

    private IndentEntity.DeliverySlot defaultSlot(BranchEntity branch) {
        if (branch.getDefaultDeliverySlot() == null) {
            return IndentEntity.DeliverySlot.MORNING;
        }
        return IndentEntity.DeliverySlot.valueOf(branch.getDefaultDeliverySlot().name());
    }

    @Transactional(readOnly = true)
    public Map<String, SlotAvailability> getSlotAvailability(UUID branchId, LocalDate scheduledDate) {
        BranchEntity branch = branchRepository.findById(branchId)
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + branchId));

        Map<String, SlotAvailability> availability = new LinkedHashMap<>();
        for (IndentEntity.DeliverySlot slot : IndentEntity.DeliverySlot.values()) {
            int capacity = slotCapacity(branch, slot);
            long booked = indentRepository.countScheduledForSlot(
                branchId,
                scheduledDate,
                slot,
                List.of(IndentEntity.Status.CANCELLED, IndentEntity.Status.DRAFT)
            );
            availability.put(slot.name(), SlotAvailability.builder()
                .slot(slot.name())
                .capacity(capacity)
                .booked((int) booked)
                .remaining(Math.max(0, capacity - (int) booked))
                .available(booked < capacity)
                .build());
        }
        return availability;
    }

    private void validateSlotCapacity(BranchEntity branch, LocalDate scheduledDate, IndentEntity.DeliverySlot slot) {
        validateSlotCapacity(branch, scheduledDate, slot, null);
    }

    private void validateSlotCapacity(BranchEntity branch, LocalDate scheduledDate, IndentEntity.DeliverySlot slot, UUID ignoreIndentId) {
        int capacity = slotCapacity(branch, slot);
        long booked = indentRepository.countScheduledForSlot(
            branch.getId(),
            scheduledDate,
            slot,
            List.of(IndentEntity.Status.CANCELLED, IndentEntity.Status.DRAFT)
        );
        if (ignoreIndentId != null) {
            IndentEntity current = findIndentOrThrow(ignoreIndentId);
            if (scheduledDate.equals(current.getScheduledDeliveryDate()) && slot == current.getPromisedDeliverySlot()) {
                booked = Math.max(0, booked - 1);
            }
        }
        if (booked >= capacity) {
            throw new BusinessException("Selected delivery slot is full for " + scheduledDate + ". Please choose another slot or date.");
        }
    }

    private int slotCapacity(BranchEntity branch, IndentEntity.DeliverySlot slot) {
        return switch (slot) {
            case MORNING -> branch.getMorningSlotCapacity() != null ? branch.getMorningSlotCapacity() : 12;
            case AFTERNOON -> branch.getAfternoonSlotCapacity() != null ? branch.getAfternoonSlotCapacity() : 12;
            case EVENING -> branch.getEveningSlotCapacity() != null ? branch.getEveningSlotCapacity() : 8;
        };
    }

    @lombok.Builder
    @lombok.Getter
    public static class SlotAvailability {
        private final String slot;
        private final int capacity;
        private final int booked;
        private final int remaining;
        private final boolean available;
    }

    @lombok.Builder
    @lombok.Getter
    public static class RoutePlanItem {
        private final UUID id;
        private final String indentNumber;
        private final UUID branchId;
        private final String branchName;
        private final String status;
        private final LocalDate scheduledDate;
        private final String requestedSlot;
        private final String promisedSlot;
        private final int itemCount;
        private final boolean cutoffApplied;
        private final String notes;
        private final LocalDateTime createdAt;
    }
}
