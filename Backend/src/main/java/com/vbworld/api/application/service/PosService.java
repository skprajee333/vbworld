package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.*;
import com.vbworld.api.infrastructure.entity.CustomerEntity;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.ItemRepository;
import com.vbworld.api.infrastructure.repository.ItemRecipeRepository;
import com.vbworld.api.infrastructure.repository.PosConsumptionLogRepository;
import com.vbworld.api.infrastructure.repository.PosCashierShiftRepository;
import com.vbworld.api.infrastructure.repository.PosOrderRepository;
import com.vbworld.api.infrastructure.repository.PosOrderPaymentRepository;
import com.vbworld.api.infrastructure.repository.QrOrderSessionRepository;
import com.vbworld.api.infrastructure.repository.RestaurantTableRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PosService {

    private static final List<PosOrderEntity.OrderStatus> ACTIVE_STATUSES =
        List.of(PosOrderEntity.OrderStatus.OPEN, PosOrderEntity.OrderStatus.KOT_SENT);

    private final BranchRepository branchRepository;
    private final RestaurantTableRepository restaurantTableRepository;
    private final PosOrderRepository posOrderRepository;
    private final PosOrderPaymentRepository posOrderPaymentRepository;
    private final PosCashierShiftRepository posCashierShiftRepository;
    private final ItemRepository itemRepository;
    private final ItemRecipeRepository itemRecipeRepository;
    private final PosConsumptionLogRepository posConsumptionLogRepository;
    private final QrOrderSessionRepository qrOrderSessionRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final GovernanceService governanceService;
    private final CustomerService customerService;

    @Transactional(readOnly = true)
    public List<TableResponse> listTables(UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        Map<UUID, PosOrderEntity> activeOrders = new HashMap<>();
        posOrderRepository.findByBranch_IdAndOrderStatusInOrderByCreatedAtDesc(branch.getId(), ACTIVE_STATUSES)
            .forEach(order -> {
                if (order.getTable() != null) {
                    activeOrders.putIfAbsent(order.getTable().getId(), order);
                }
            });

        return restaurantTableRepository.findByBranch_IdAndActiveTrueOrderByTableNumberAsc(branch.getId()).stream()
            .map(table -> toTableResponse(table, activeOrders.get(table.getId())))
            .toList();
    }

    @Transactional(readOnly = true)
    public List<PosOrderResponse> listActiveOrders(UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        return posOrderRepository.findByBranch_IdAndOrderStatusInOrderByCreatedAtDesc(branch.getId(), ACTIVE_STATUSES).stream()
            .map(this::toOrderResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public CashierShiftResponse getShiftSummary(UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        PosCashierShiftEntity shift = posCashierShiftRepository
            .findFirstByBranch_IdAndUser_IdAndShiftStatusOrderByOpenedAtDesc(
                branch.getId(), currentUser.getId(), PosCashierShiftEntity.ShiftStatus.OPEN)
            .orElse(null);

        LocalDateTime from = shift != null ? shift.getOpenedAt() : LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime to = LocalDateTime.now();
        Map<String, BigDecimal> totals = calculatePaymentTotals(branch.getId(), currentUser.getId(), from, to);
        BigDecimal expectedCash = safe(shift != null ? shift.getOpeningCash() : BigDecimal.ZERO)
            .add(totals.getOrDefault(PosOrderPaymentEntity.PaymentMethod.CASH.name(), BigDecimal.ZERO));

        return CashierShiftResponse.builder()
            .shiftId(shift != null ? shift.getId() : null)
            .status(shift != null ? shift.getShiftStatus().name() : "CLOSED")
            .openingCash(shift != null ? shift.getOpeningCash() : BigDecimal.ZERO)
            .expectedCash(expectedCash)
            .closingCash(shift != null ? shift.getClosingCash() : null)
            .varianceAmount(shift != null ? shift.getVarianceAmount() : null)
            .openedAt(shift != null ? shift.getOpenedAt() : null)
            .closedAt(shift != null ? shift.getClosedAt() : null)
            .notes(shift != null ? shift.getNotes() : null)
            .paymentTotals(totals)
            .build();
    }

    @Transactional
    public CashierShiftResponse openShift(OpenShiftRequest request, UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        posCashierShiftRepository
            .findFirstByBranch_IdAndUser_IdAndShiftStatusOrderByOpenedAtDesc(
                branch.getId(), currentUser.getId(), PosCashierShiftEntity.ShiftStatus.OPEN)
            .ifPresent(existing -> {
                throw new BusinessException("An active cashier shift is already open");
            });

        PosCashierShiftEntity shift = PosCashierShiftEntity.builder()
            .branch(branch)
            .user(currentUser)
            .shiftStatus(PosCashierShiftEntity.ShiftStatus.OPEN)
            .openingCash(safe(request.getOpeningCash()).setScale(2, RoundingMode.HALF_UP))
            .notes(trim(request.getNotes()))
            .openedAt(LocalDateTime.now())
            .build();

        posCashierShiftRepository.save(shift);
        governanceService.logAction(currentUser, "POS", "SHIFT_OPENED", "POS_SHIFT", shift.getId(),
            "Opened cashier shift", "openingCash=" + shift.getOpeningCash());
        return getShiftSummary(currentUser);
    }

    @Transactional
    public CashierShiftResponse closeShift(CloseShiftRequest request, UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        PosCashierShiftEntity shift = posCashierShiftRepository
            .findFirstByBranch_IdAndUser_IdAndShiftStatusOrderByOpenedAtDesc(
                branch.getId(), currentUser.getId(), PosCashierShiftEntity.ShiftStatus.OPEN)
            .orElseThrow(() -> new BusinessException("No open cashier shift found"));

        Map<String, BigDecimal> totals = calculatePaymentTotals(branch.getId(), currentUser.getId(), shift.getOpenedAt(), LocalDateTime.now());
        BigDecimal expectedCash = shift.getOpeningCash().add(
            totals.getOrDefault(PosOrderPaymentEntity.PaymentMethod.CASH.name(), BigDecimal.ZERO));
        BigDecimal closingCash = safe(request.getClosingCash()).setScale(2, RoundingMode.HALF_UP);

        shift.setExpectedCash(expectedCash);
        shift.setClosingCash(closingCash);
        shift.setVarianceAmount(closingCash.subtract(expectedCash).setScale(2, RoundingMode.HALF_UP));
        shift.setNotes(trim(request.getNotes()));
        shift.setClosedAt(LocalDateTime.now());
        shift.setShiftStatus(PosCashierShiftEntity.ShiftStatus.CLOSED);

        posCashierShiftRepository.save(shift);
        governanceService.logAction(currentUser, "POS", "SHIFT_CLOSED", "POS_SHIFT", shift.getId(),
            "Closed cashier shift", "variance=" + shift.getVarianceAmount());
        return getShiftSummary(currentUser);
    }

    @Transactional
    public QrSessionResponse createQrSession(UUID tableId, UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        RestaurantTableEntity table = restaurantTableRepository.findById(tableId)
            .orElseThrow(() -> new ResourceNotFoundException("Table not found: " + tableId));
        if (!table.getBranch().getId().equals(branch.getId())) {
            throw new AccessDeniedException("Table does not belong to your branch");
        }

        expireActiveSessions(table.getId());

        QrOrderSessionEntity session = QrOrderSessionEntity.builder()
            .branch(branch)
            .table(table)
            .sessionToken(UUID.randomUUID().toString().replace("-", ""))
            .expiresAt(LocalDateTime.now().plusHours(12))
            .createdBy(currentUser)
            .build();

        QrOrderSessionEntity saved = qrOrderSessionRepository.save(session);
        governanceService.logAction(
            currentUser,
            "POS",
            "QR_SESSION_CREATED",
            "QR_ORDER_SESSION",
            saved.getId(),
            "Created QR self-order session for table " + table.getTableNumber(),
            "expiresAt=" + saved.getExpiresAt());
        return toQrSessionResponse(saved, currentActiveOrder(table.getId()));
    }

    @Transactional(readOnly = true)
    public QrSessionResponse getQrSession(String token) {
        QrOrderSessionEntity session = getPublicActiveSession(token);
        return toQrSessionResponse(session, currentActiveOrder(session.getTable().getId()));
    }

    @Transactional
    public PosOrderResponse submitQrOrder(String token, SavePosOrderRequest request) {
        QrOrderSessionEntity session = getPublicActiveSession(token);
        RestaurantTableEntity table = session.getTable();
        BranchEntity branch = session.getBranch();

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessException("Add at least one item to place a QR order");
        }

        PosOrderEntity order = posOrderRepository
            .findFirstByTable_IdAndOrderStatusInOrderByCreatedAtDesc(table.getId(), ACTIVE_STATUSES)
            .orElseGet(() -> PosOrderEntity.builder()
                .branch(branch)
                .table(table)
                .orderNumber(generateOrderNumber())
                .orderType(PosOrderEntity.OrderType.DINE_IN)
                .build());

        if (order.getId() == null) {
            order.setItems(new ArrayList<>());
        }

        upsertOrderLines(order, request.getItems());

        order.setCustomerName(trim(coalesce(request.getCustomerName(), session.getCustomerName())));
        order.setCustomerPhone(normalizePhone(coalesce(request.getCustomerPhone(), session.getCustomerPhone())));
        order.setGuestCount(normalizeGuestCount(request.getGuestCount()));
        order.setNotes(trim(coalesce(request.getNotes(), session.getNotes())));
        recalculate(order, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        table.setTableStatus(RestaurantTableEntity.TableStatus.OCCUPIED);
        restaurantTableRepository.save(table);
        PosOrderEntity saved = posOrderRepository.save(order);

        session.setCustomerName(saved.getCustomerName());
        session.setCustomerPhone(saved.getCustomerPhone());
        session.setNotes(saved.getNotes());
        session.setLastOrderedAt(LocalDateTime.now());
        qrOrderSessionRepository.save(session);

        governanceService.logAction(
            null,
            "POS",
            "QR_ORDER_PLACED",
            "POS_ORDER",
            saved.getId(),
            "Placed QR self-order for table " + table.getTableNumber(),
            "orderNumber=" + saved.getOrderNumber() + ", items=" + saved.getItems().size());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersForBranch(branch.getId()),
            "QR_ORDER",
            "New QR self-order",
            "Table " + table.getTableNumber() + " placed a self-order for " + saved.getOrderNumber(),
            "/pos",
            "POS_ORDER",
            saved.getId());
        return toOrderResponse(saved);
    }

    @Transactional
    public PosOrderResponse saveTableOrder(UUID tableId, SavePosOrderRequest request, UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        RestaurantTableEntity table = restaurantTableRepository.findById(tableId)
            .orElseThrow(() -> new ResourceNotFoundException("Table not found: " + tableId));

        if (!table.getBranch().getId().equals(branch.getId())) {
            throw new AccessDeniedException("Table does not belong to your branch");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new BusinessException("Add at least one item to create a bill");
        }

        PosOrderEntity order = posOrderRepository
            .findFirstByTable_IdAndOrderStatusInOrderByCreatedAtDesc(tableId, ACTIVE_STATUSES)
            .orElseGet(() -> PosOrderEntity.builder()
                .branch(branch)
                .table(table)
                .orderNumber(generateOrderNumber())
                .orderType(PosOrderEntity.OrderType.DINE_IN)
                .createdBy(currentUser)
                .updatedBy(currentUser)
                .build());

        if (order.getId() == null) {
            order.setItems(new ArrayList<>());
        }
        upsertOrderLines(order, request.getItems());

        if (order.getOrderStatus() == PosOrderEntity.OrderStatus.KOT_SENT) {
            order.setOrderStatus(PosOrderEntity.OrderStatus.OPEN);
        }

        order.setCustomerName(trim(request.getCustomerName()));
        order.setCustomerPhone(normalizePhone(request.getCustomerPhone()));
        order.setAssignedStaffName(trim(request.getAssignedStaffName()));
        order.setGuestCount(normalizeGuestCount(request.getGuestCount()));
        order.setNotes(trim(request.getNotes()));
        order.setUpdatedBy(currentUser);
        recalculate(order, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        table.setTableStatus(RestaurantTableEntity.TableStatus.OCCUPIED);

        PosOrderEntity saved = posOrderRepository.save(order);
        restaurantTableRepository.save(table);
        governanceService.logAction(
            currentUser,
            "POS",
            "POS_ORDER_SAVED",
            "POS_ORDER",
            saved.getId(),
            "Saved POS order " + saved.getOrderNumber(),
            "table=" + table.getTableNumber() + ", items=" + saved.getItems().size()
        );
        return toOrderResponse(saved);
    }

    @Transactional
    public PosOrderResponse sendKot(UUID orderId, UserEntity currentUser) {
        PosOrderEntity order = getOwnedOrder(orderId, currentUser);
        if (order.getItems().isEmpty()) {
            throw new BusinessException("Cannot send KOT for an empty order");
        }
        consumeRecipeIngredients(order, currentUser);
        order.setOrderStatus(PosOrderEntity.OrderStatus.KOT_SENT);
        order.setServiceStatus(PosOrderEntity.ServiceStatus.PREPARING);
        order.setKotSentAt(LocalDateTime.now());
        order.setUpdatedBy(currentUser);

        PosOrderEntity saved = posOrderRepository.save(order);
        governanceService.logAction(
            currentUser, "POS", "KOT_SENT", "POS_ORDER", saved.getId(),
            "Sent KOT for " + saved.getOrderNumber(), null);
        return toOrderResponse(saved);
    }

    @Transactional
    public PosOrderResponse settleOrder(UUID orderId, SettlePosOrderRequest request, UserEntity currentUser) {
        PosOrderEntity order = getOwnedOrder(orderId, currentUser);
        if (order.getOrderStatus() == PosOrderEntity.OrderStatus.PAID) {
            throw new BusinessException("This bill has already been settled");
        }

        int redeemPoints = request.getRedeemPoints() != null ? Math.max(request.getRedeemPoints(), 0) : 0;
        CustomerEntity customer = customerService.resolvePosCustomer(order.getCustomerName(), order.getCustomerPhone(), order.getBranch());
        if (redeemPoints > 0) {
            if (customer == null) {
                throw new BusinessException("Customer phone is required to redeem loyalty points");
            }
            if (customer.getPointsBalance() < redeemPoints) {
                throw new BusinessException("Customer does not have enough loyalty points");
            }
        }

        BigDecimal loyaltyDiscountAmount = BigDecimal.valueOf(redeemPoints).setScale(2, RoundingMode.HALF_UP);
        recalculate(order, safe(request.getDiscountAmount()), safe(request.getTaxAmount()), loyaltyDiscountAmount);
        order.setCouponCode(trim(request.getCouponCode()));
        order.setSplitCount(request.getPayments() != null && !request.getPayments().isEmpty()
            ? Math.max(1, request.getPayments().size()) : 1);
        order.setCustomer(customer);
        order.setLoyaltyRedeemedPoints(redeemPoints);
        order.setCustomerName(trim(order.getCustomerName()));
        order.setCustomerPhone(order.getCustomerPhone() != null ? order.getCustomerPhone().replaceAll("[^0-9]", "") : null);

        order.getPayments().clear();
        BigDecimal paymentTotal = BigDecimal.ZERO;
        if (request.getPayments() != null && !request.getPayments().isEmpty()) {
            for (PaymentRequest payment : request.getPayments()) {
                BigDecimal amount = safe(payment.getAmount()).setScale(2, RoundingMode.HALF_UP);
                if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BusinessException("Payment amounts must be greater than zero");
                }
                paymentTotal = paymentTotal.add(amount);
                order.addPayment(PosOrderPaymentEntity.builder()
                    .paymentMethod(payment.getPaymentMethod())
                    .amount(amount)
                    .referenceNumber(trim(payment.getReferenceNumber()))
                    .build());
            }
        } else {
            paymentTotal = order.getTotalAmount();
            order.addPayment(PosOrderPaymentEntity.builder()
                .paymentMethod(PosOrderPaymentEntity.PaymentMethod.CASH)
                .amount(order.getTotalAmount())
                .build());
        }

        if (paymentTotal.setScale(2, RoundingMode.HALF_UP).compareTo(order.getTotalAmount()) != 0) {
            throw new BusinessException("Split payment total must match the final bill amount");
        }

        order.setOrderStatus(PosOrderEntity.OrderStatus.PAID);
        order.setServiceStatus(PosOrderEntity.ServiceStatus.CLOSED);
        order.setBilledAt(LocalDateTime.now());
        order.setPaidAt(LocalDateTime.now());
        order.setUpdatedBy(currentUser);

        if (order.getTable() != null) {
            order.getTable().setTableStatus(RestaurantTableEntity.TableStatus.AVAILABLE);
            restaurantTableRepository.save(order.getTable());
        }

        PosOrderEntity saved = posOrderRepository.save(order);
        customerService.applyPosSettlement(customer, saved, redeemPoints, currentUser);
        governanceService.logAction(
            currentUser, "POS", "BILL_SETTLED", "POS_ORDER", saved.getId(),
            "Settled POS bill " + saved.getOrderNumber(),
            "total=" + saved.getTotalAmount() + ", payments=" + saved.getPayments().size());
        return toOrderResponse(saved);
    }

    @Transactional
    public PosOrderResponse cancelOrder(UUID orderId, UserEntity currentUser) {
        PosOrderEntity order = getOwnedOrder(orderId, currentUser);
        order.setOrderStatus(PosOrderEntity.OrderStatus.CANCELLED);
        order.setServiceStatus(PosOrderEntity.ServiceStatus.CLOSED);
        order.setUpdatedBy(currentUser);
        if (order.getTable() != null) {
            order.getTable().setTableStatus(RestaurantTableEntity.TableStatus.AVAILABLE);
            restaurantTableRepository.save(order.getTable());
        }
        PosOrderEntity saved = posOrderRepository.save(order);
        governanceService.logAction(
            currentUser, "POS", "POS_ORDER_CANCELLED", "POS_ORDER", saved.getId(),
            "Cancelled POS order " + saved.getOrderNumber(), null);
        return toOrderResponse(saved);
    }

    @Transactional
    public List<PosOrderResponse> splitOrder(UUID orderId, List<SplitLineRequest> lines, UserEntity currentUser) {
        PosOrderEntity source = getOwnedOrder(orderId, currentUser);
        if (lines == null || lines.isEmpty()) {
            throw new BusinessException("Choose at least one item to split");
        }

        PosOrderEntity splitOrder = PosOrderEntity.builder()
            .branch(source.getBranch())
            .table(source.getTable())
            .orderNumber(generateOrderNumber())
            .orderType(source.getOrderType())
            .orderStatus(source.getOrderStatus())
            .customerName(source.getCustomerName())
            .customerPhone(source.getCustomerPhone())
            .notes(source.getNotes())
            .createdBy(currentUser)
            .updatedBy(currentUser)
            .build();

        for (SplitLineRequest request : lines) {
            PosOrderItemEntity sourceItem = source.getItems().stream()
                .filter(item -> item.getId().equals(request.getOrderItemId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("POS order line not found: " + request.getOrderItemId()));

            BigDecimal splitQty = safe(request.getQuantity());
            if (splitQty.compareTo(BigDecimal.ZERO) <= 0 || splitQty.compareTo(sourceItem.getQuantity()) > 0) {
                throw new BusinessException("Invalid split quantity for " + sourceItem.getItem().getName());
            }

            sourceItem.setQuantity(sourceItem.getQuantity().subtract(splitQty));
            sourceItem.setLineTotal(sourceItem.getQuantity().multiply(sourceItem.getUnitPrice()).setScale(2, RoundingMode.HALF_UP));

            splitOrder.addItem(PosOrderItemEntity.builder()
                .item(sourceItem.getItem())
                .quantity(splitQty)
                .unitPrice(sourceItem.getUnitPrice())
                .lineTotal(splitQty.multiply(sourceItem.getUnitPrice()).setScale(2, RoundingMode.HALF_UP))
                .notes(sourceItem.getNotes())
                .build());
        }

        source.getItems().removeIf(item -> item.getQuantity().compareTo(BigDecimal.ZERO) == 0);
        if (source.getItems().isEmpty()) {
            throw new BusinessException("Cannot split the entire bill. Use separate settlement or cancellation instead.");
        }

        recalculate(source, source.getDiscountAmount(), source.getTaxAmount(), source.getLoyaltyDiscountAmount());
        splitOrder.setDiscountAmount(BigDecimal.ZERO);
        splitOrder.setTaxAmount(BigDecimal.ZERO);
        splitOrder.setLoyaltyDiscountAmount(BigDecimal.ZERO);
        splitOrder.setLoyaltyRedeemedPoints(0);
        recalculate(splitOrder, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        PosOrderEntity savedSource = posOrderRepository.save(source);
        PosOrderEntity savedSplit = posOrderRepository.save(splitOrder);
        governanceService.logAction(
            currentUser, "POS", "BILL_SPLIT", "POS_ORDER", savedSource.getId(),
            "Split bill " + savedSource.getOrderNumber() + " into " + savedSplit.getOrderNumber(),
            "newTotal=" + savedSplit.getTotalAmount());
        return List.of(toOrderResponse(savedSource), toOrderResponse(savedSplit));
    }

    @Transactional
    public PosOrderResponse mergeOrders(UUID targetOrderId, UUID sourceOrderId, UserEntity currentUser) {
        if (targetOrderId.equals(sourceOrderId)) {
            throw new BusinessException("Choose two different bills to merge");
        }

        PosOrderEntity target = getOwnedOrder(targetOrderId, currentUser);
        PosOrderEntity source = getOwnedOrder(sourceOrderId, currentUser);

        if (target.getOrderStatus() == PosOrderEntity.OrderStatus.PAID || source.getOrderStatus() == PosOrderEntity.OrderStatus.PAID) {
            throw new BusinessException("Paid bills cannot be merged");
        }
        if (target.getTable() == null || source.getTable() == null || !target.getTable().getId().equals(source.getTable().getId())) {
            throw new BusinessException("Only bills from the same table can be merged");
        }

        for (PosOrderItemEntity sourceItem : new ArrayList<>(source.getItems())) {
            PosOrderItemEntity targetItem = target.getItems().stream()
                .filter(item -> item.getItem().getId().equals(sourceItem.getItem().getId())
                    && Objects.equals(item.getNotes(), sourceItem.getNotes()))
                .findFirst()
                .orElse(null);

            if (targetItem != null) {
                targetItem.setQuantity(targetItem.getQuantity().add(sourceItem.getQuantity()));
                targetItem.setLineTotal(targetItem.getQuantity().multiply(targetItem.getUnitPrice()).setScale(2, RoundingMode.HALF_UP));
            } else {
                target.addItem(PosOrderItemEntity.builder()
                    .item(sourceItem.getItem())
                    .quantity(sourceItem.getQuantity())
                    .unitPrice(sourceItem.getUnitPrice())
                    .lineTotal(sourceItem.getLineTotal())
                    .notes(sourceItem.getNotes())
                    .build());
            }
        }

        source.getItems().clear();
        source.setOrderStatus(PosOrderEntity.OrderStatus.CANCELLED);
        source.setServiceStatus(PosOrderEntity.ServiceStatus.CLOSED);
        source.setUpdatedBy(currentUser);
        source.setNotes(trim((source.getNotes() == null ? "" : source.getNotes() + " ") + "[Merged into " + target.getOrderNumber() + "]"));

        recalculate(target, target.getDiscountAmount(), target.getTaxAmount(), target.getLoyaltyDiscountAmount());
        target.setUpdatedBy(currentUser);

        posOrderRepository.save(source);
        PosOrderEntity savedTarget = posOrderRepository.save(target);
        governanceService.logAction(
            currentUser, "POS", "BILLS_MERGED", "POS_ORDER", savedTarget.getId(),
            "Merged bill " + source.getOrderNumber() + " into " + savedTarget.getOrderNumber(),
            null);
        return toOrderResponse(savedTarget);
    }

    @Transactional
    public PosOrderResponse updateService(UUID orderId, UpdateServiceRequest request, UserEntity currentUser) {
        PosOrderEntity order = getOwnedOrder(orderId, currentUser);
        if (order.getOrderStatus() == PosOrderEntity.OrderStatus.PAID || order.getOrderStatus() == PosOrderEntity.OrderStatus.CANCELLED) {
            throw new BusinessException("Cannot update service controls for a closed bill");
        }

        if (request.getAssignedStaffName() != null) {
            order.setAssignedStaffName(trim(request.getAssignedStaffName()));
        }
        if (request.getGuestCount() != null) {
            order.setGuestCount(normalizeGuestCount(request.getGuestCount()));
        }
        if (request.getServiceStatus() != null) {
            order.setServiceStatus(request.getServiceStatus());
            if (request.getServiceStatus() == PosOrderEntity.ServiceStatus.SERVED && order.getServedAt() == null) {
                order.setServedAt(LocalDateTime.now());
            }
            if (request.getServiceStatus() == PosOrderEntity.ServiceStatus.BILL_REQUESTED && order.getBillRequestedAt() == null) {
                order.setBillRequestedAt(LocalDateTime.now());
            }
        }
        order.setUpdatedBy(currentUser);

        PosOrderEntity saved = posOrderRepository.save(order);
        governanceService.logAction(
            currentUser, "POS", "SERVICE_UPDATED", "POS_ORDER", saved.getId(),
            "Updated table service for " + saved.getOrderNumber(),
            "serviceStatus=" + saved.getServiceStatus() + ", staff=" + saved.getAssignedStaffName() + ", guests=" + saved.getGuestCount());
        return toOrderResponse(saved);
    }

    @Transactional
    public PosOrderResponse requestBillFromQr(String token) {
        QrOrderSessionEntity session = getPublicActiveSession(token);
        PosOrderEntity order = currentActiveOrder(session.getTable().getId());
        if (order == null) {
            throw new BusinessException("No active bill found for this table");
        }
        if (order.getOrderStatus() == PosOrderEntity.OrderStatus.PAID || order.getOrderStatus() == PosOrderEntity.OrderStatus.CANCELLED) {
            throw new BusinessException("This table bill is already closed");
        }
        order.setServiceStatus(PosOrderEntity.ServiceStatus.BILL_REQUESTED);
        if (order.getBillRequestedAt() == null) {
            order.setBillRequestedAt(LocalDateTime.now());
        }
        PosOrderEntity saved = posOrderRepository.save(order);
        governanceService.logAction(
            null, "POS", "QR_BILL_REQUESTED", "POS_ORDER", saved.getId(),
            "Guest requested bill for " + saved.getOrderNumber(),
            "table=" + session.getTable().getTableNumber());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersForBranch(session.getBranch().getId()),
            "QR_BILL",
            "Guest requested bill",
            "Table " + session.getTable().getTableNumber() + " requested the bill",
            "/pos",
            "POS_ORDER",
            saved.getId());
        return toOrderResponse(saved);
    }

    private PosOrderEntity getOwnedOrder(UUID orderId, UserEntity currentUser) {
        BranchEntity branch = requireBranchUser(currentUser);
        PosOrderEntity order = posOrderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("POS order not found: " + orderId));
        if (!order.getBranch().getId().equals(branch.getId())) {
            throw new AccessDeniedException("POS order does not belong to your branch");
        }
        return order;
    }

    private void upsertOrderLines(PosOrderEntity order, List<OrderLineRequest> lines) {
        for (OrderLineRequest line : lines) {
            ItemEntity item = itemRepository.findById(line.getItemId())
                .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + line.getItemId()));
            BigDecimal quantity = safe(line.getQuantity());
            if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessException("Quantity must be greater than zero");
            }

            PosOrderItemEntity existing = order.getItems().stream()
                .filter(orderItem -> orderItem.getItem().getId().equals(item.getId())
                    && Objects.equals(trim(orderItem.getNotes()), trim(line.getNotes())))
                .findFirst()
                .orElse(null);

            if (existing != null) {
                existing.setQuantity(existing.getQuantity().add(quantity));
                existing.setLineTotal(existing.getQuantity().multiply(existing.getUnitPrice()).setScale(2, RoundingMode.HALF_UP));
                if (line.getNotes() != null && !line.getNotes().isBlank()) {
                    existing.setNotes(line.getNotes().trim());
                }
            } else {
                BigDecimal price = safe(item.getSalePrice());
                order.addItem(PosOrderItemEntity.builder()
                    .item(item)
                    .quantity(quantity)
                    .unitPrice(price)
                    .lineTotal(quantity.multiply(price).setScale(2, RoundingMode.HALF_UP))
                    .notes(trim(line.getNotes()))
                    .build());
            }
        }
    }

    private BranchEntity requireBranchUser(UserEntity currentUser) {
        if (!(currentUser.isRestaurant() || currentUser.isAdmin() || currentUser.isWarehouseAdmin())) {
            throw new AccessDeniedException("You do not have access to POS");
        }
        if (currentUser.getBranch() == null) {
            throw new BusinessException("A branch is required for POS operations");
        }
        UUID branchId = currentUser.getBranch().getId();
        return branchRepository.findById(branchId)
            .orElseThrow(() -> new ResourceNotFoundException("Branch not found: " + branchId));
    }

    private void recalculate(
        PosOrderEntity order,
        BigDecimal discountAmount,
        BigDecimal taxAmount,
        BigDecimal loyaltyDiscountAmount
    ) {
        BigDecimal subtotal = order.getItems().stream()
            .map(PosOrderItemEntity::getLineTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
        order.setSubtotal(subtotal);
        order.setDiscountAmount(discountAmount);
        order.setLoyaltyDiscountAmount(loyaltyDiscountAmount);
        order.setTaxAmount(taxAmount);
        order.setTotalAmount(subtotal
            .subtract(discountAmount)
            .subtract(loyaltyDiscountAmount)
            .add(taxAmount)
            .max(BigDecimal.ZERO)
            .setScale(2, RoundingMode.HALF_UP));
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String normalizePhone(String value) {
        String trimmed = trim(value);
        return trimmed == null ? null : trimmed.replaceAll("[^0-9]", "");
    }

    private Integer normalizeGuestCount(Integer value) {
        if (value == null) {
            return 1;
        }
        return Math.max(1, value);
    }

    private String trim(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String coalesce(String first, String second) {
        return trim(first) != null ? first : second;
    }

    private String generateOrderNumber() {
        return "POS-" + DateTimeFormatter.ofPattern("yyyyMMddHHmmss").format(LocalDateTime.now());
    }

    private void consumeRecipeIngredients(PosOrderEntity order, UserEntity currentUser) {
        List<UUID> orderItemIds = order.getItems().stream()
            .map(PosOrderItemEntity::getId)
            .filter(Objects::nonNull)
            .toList();

        Map<UUID, BigDecimal> consumedByOrderItem = new HashMap<>();
        if (!orderItemIds.isEmpty()) {
            for (Object[] row : posConsumptionLogRepository.sumConsumedByOrderItemIds(orderItemIds)) {
                UUID orderItemId = row[0] instanceof UUID uuid ? uuid : UUID.fromString(row[0].toString());
                consumedByOrderItem.put(orderItemId, safe((BigDecimal) row[1]));
            }
        }

        List<UUID> menuItemIds = order.getItems().stream()
            .map(item -> item.getItem().getId())
            .distinct()
            .toList();
        Map<UUID, ItemRecipeEntity> recipesByMenuItem = new HashMap<>();
        itemRecipeRepository.findByMenuItem_IdInAndActiveTrue(menuItemIds)
            .forEach(recipe -> recipesByMenuItem.put(recipe.getMenuItem().getId(), recipe));

        List<ConsumptionPlanLine> plan = new ArrayList<>();
        Map<UUID, BigDecimal> ingredientTotals = new HashMap<>();

        for (PosOrderItemEntity orderItem : order.getItems()) {
            ItemRecipeEntity recipe = recipesByMenuItem.get(orderItem.getItem().getId());
            if (recipe == null) {
                continue;
            }
            BigDecimal alreadyConsumed = safe(consumedByOrderItem.get(orderItem.getId()));
            BigDecimal pendingQuantity = safe(orderItem.getQuantity()).subtract(alreadyConsumed);
            if (pendingQuantity.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            BigDecimal outputQuantity = safe(recipe.getOutputQuantity()).compareTo(BigDecimal.ZERO) > 0
                ? safe(recipe.getOutputQuantity())
                : BigDecimal.ONE;

            for (ItemRecipeIngredientEntity ingredient : recipe.getIngredients()) {
                BigDecimal baseRequired = pendingQuantity.multiply(safe(ingredient.getQuantityRequired()))
                    .divide(outputQuantity, 3, RoundingMode.HALF_UP);
                BigDecimal wastageMultiplier = BigDecimal.ONE.add(
                    safe(ingredient.getWastagePct()).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP));
                BigDecimal quantityToConsume = baseRequired.multiply(wastageMultiplier).setScale(3, RoundingMode.HALF_UP);
                if (quantityToConsume.compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                plan.add(new ConsumptionPlanLine(orderItem, recipe, ingredient, quantityToConsume));
                ingredientTotals.merge(ingredient.getIngredientItem().getId(), quantityToConsume, BigDecimal::add);
            }
        }

        if (plan.isEmpty()) {
            return;
        }

        Map<UUID, WarehouseStockEntity> stocksByIngredient = new HashMap<>();
        for (UUID ingredientItemId : ingredientTotals.keySet()) {
            WarehouseStockEntity stock = warehouseStockRepository.findByItem_Id(ingredientItemId)
                .orElseThrow(() -> new BusinessException("No warehouse stock configured for ingredient item"));
            BigDecimal requiredQty = ingredientTotals.get(ingredientItemId);
            if (safe(stock.getQuantity()).compareTo(requiredQty) < 0) {
                throw new BusinessException("Insufficient stock for ingredient " + stock.getItem().getName());
            }
            stocksByIngredient.put(ingredientItemId, stock);
        }

        for (ConsumptionPlanLine line : plan) {
            WarehouseStockEntity stock = stocksByIngredient.get(line.ingredient.getIngredientItem().getId());
            BigDecimal stockBefore = safe(stock.getQuantity());
            BigDecimal stockAfter = stockBefore.subtract(line.quantityToConsume).setScale(3, RoundingMode.HALF_UP);
            stock.setQuantity(stockAfter);
            stock.setLastUpdatedAt(LocalDateTime.now());
            stock.setUpdatedBy(currentUser);
            warehouseStockRepository.save(stock);

            posConsumptionLogRepository.save(PosConsumptionLogEntity.builder()
                .order(order)
                .orderItem(line.orderItem)
                .recipe(line.recipe)
                .menuItem(line.recipe.getMenuItem())
                .ingredientItem(line.ingredient.getIngredientItem())
                .quantityConsumed(line.quantityToConsume)
                .stockBefore(stockBefore)
                .stockAfter(stockAfter)
                .sourceEvent(PosConsumptionLogEntity.SourceEvent.KOT)
                .consumedBy(currentUser)
                .notes("Recipe consumption for " + line.orderItem.getItem().getName())
                .build());
        }

        governanceService.logAction(
            currentUser,
            "POS",
            "RECIPE_CONSUMPTION_POSTED",
            "POS_ORDER",
            order.getId(),
            "Posted recipe consumption for " + order.getOrderNumber(),
            "items=" + plan.size());
    }

    private Map<String, BigDecimal> calculatePaymentTotals(UUID branchId, UUID userId, LocalDateTime from, LocalDateTime to) {
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (PosOrderPaymentEntity.PaymentMethod method : PosOrderPaymentEntity.PaymentMethod.values()) {
            totals.put(method.name(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }
        posOrderRepository.findByBranch_IdAndUpdatedBy_IdAndPaidAtBetweenOrderByPaidAtDesc(branchId, userId, from, to)
            .forEach(order -> order.getPayments().forEach(payment ->
                totals.compute(payment.getPaymentMethod().name(), (key, value) ->
                    safe(value).add(safe(payment.getAmount())).setScale(2, RoundingMode.HALF_UP))));
        return totals;
    }

    private record ConsumptionPlanLine(
        PosOrderItemEntity orderItem,
        ItemRecipeEntity recipe,
        ItemRecipeIngredientEntity ingredient,
        BigDecimal quantityToConsume
    ) {
    }

    private TableResponse toTableResponse(RestaurantTableEntity table, PosOrderEntity order) {
        return TableResponse.builder()
            .id(table.getId())
            .tableNumber(table.getTableNumber())
            .capacity(table.getCapacity())
            .status(table.getTableStatus().name())
            .currentOrder(order != null ? toOrderResponse(order) : null)
            .build();
    }

    private PosOrderResponse toOrderResponse(PosOrderEntity order) {
        return PosOrderResponse.builder()
            .id(order.getId())
            .orderNumber(order.getOrderNumber())
            .tableId(order.getTable() != null ? order.getTable().getId() : null)
            .tableNumber(order.getTable() != null ? order.getTable().getTableNumber() : null)
            .customerId(order.getCustomer() != null ? order.getCustomer().getId() : null)
            .orderType(order.getOrderType().name())
            .status(order.getOrderStatus().name())
            .serviceStatus(order.getServiceStatus().name())
            .customerName(order.getCustomerName())
            .customerPhone(order.getCustomerPhone())
            .assignedStaffName(order.getAssignedStaffName())
            .guestCount(order.getGuestCount())
            .notes(order.getNotes())
            .subtotal(order.getSubtotal())
            .discountAmount(order.getDiscountAmount())
            .loyaltyDiscountAmount(order.getLoyaltyDiscountAmount())
            .loyaltyRedeemedPoints(order.getLoyaltyRedeemedPoints())
            .couponCode(order.getCouponCode())
            .splitCount(order.getSplitCount())
            .taxAmount(order.getTaxAmount())
            .totalAmount(order.getTotalAmount())
            .kotSentAt(order.getKotSentAt())
            .servedAt(order.getServedAt())
            .billRequestedAt(order.getBillRequestedAt())
            .paidAt(order.getPaidAt())
            .createdAt(order.getCreatedAt())
            .payments(order.getPayments().stream()
                .map(payment -> PosOrderPaymentResponse.builder()
                    .id(payment.getId())
                    .paymentMethod(payment.getPaymentMethod().name())
                    .amount(payment.getAmount())
                    .referenceNumber(payment.getReferenceNumber())
                    .build())
                .toList())
            .items(order.getItems().stream()
                .map(item -> PosOrderLineResponse.builder()
                    .id(item.getId())
                    .itemId(item.getItem().getId())
                    .itemName(item.getItem().getName())
                    .quantity(item.getQuantity())
                    .unitPrice(item.getUnitPrice())
                    .lineTotal(item.getLineTotal())
                    .notes(item.getNotes())
                    .build())
                .toList())
            .build();
    }

    private PosOrderEntity currentActiveOrder(UUID tableId) {
        return posOrderRepository.findFirstByTable_IdAndOrderStatusInOrderByCreatedAtDesc(tableId, ACTIVE_STATUSES)
            .orElse(null);
    }

    private void expireActiveSessions(UUID tableId) {
        qrOrderSessionRepository.findByTable_IdAndSessionStatus(tableId, QrOrderSessionEntity.SessionStatus.ACTIVE)
            .forEach(session -> {
                session.setSessionStatus(QrOrderSessionEntity.SessionStatus.EXPIRED);
                session.setExpiresAt(LocalDateTime.now());
            });
    }

    private QrOrderSessionEntity getPublicActiveSession(String token) {
        QrOrderSessionEntity session = qrOrderSessionRepository
            .findBySessionTokenAndSessionStatus(trim(token), QrOrderSessionEntity.SessionStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("QR order session not found"));
        if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
            session.setSessionStatus(QrOrderSessionEntity.SessionStatus.EXPIRED);
            qrOrderSessionRepository.save(session);
            throw new BusinessException("This QR order link has expired");
        }
        return session;
    }

    private QrSessionResponse toQrSessionResponse(QrOrderSessionEntity session, PosOrderEntity activeOrder) {
        List<QrMenuItemResponse> menuItems = itemRepository.findAll().stream()
            .filter(ItemEntity::isActive)
            .sorted(Comparator
                .comparing((ItemEntity item) -> item.getCategory() != null ? safeCategorySort(item.getCategory().getSortOrder()) : Integer.MAX_VALUE)
                .thenComparing(ItemEntity::getName))
            .map(item -> QrMenuItemResponse.builder()
                .id(item.getId())
                .code(item.getCode())
                .name(item.getName())
                .category(item.getCategory() != null ? item.getCategory().getName() : null)
                .unit(item.getUnit())
                .salePrice(item.getSalePrice())
                .build())
            .toList();

        return QrSessionResponse.builder()
            .sessionId(session.getId())
            .sessionToken(session.getSessionToken())
            .status(session.getSessionStatus().name())
            .branchId(session.getBranch().getId())
            .branchName(session.getBranch().getName())
            .tableId(session.getTable().getId())
            .tableNumber(session.getTable().getTableNumber())
            .capacity(session.getTable().getCapacity())
            .expiresAt(session.getExpiresAt())
            .lastOrderedAt(session.getLastOrderedAt())
            .customerName(session.getCustomerName())
            .customerPhone(session.getCustomerPhone())
            .notes(session.getNotes())
            .publicPath("/qr/" + session.getSessionToken())
            .activeOrder(activeOrder != null ? toOrderResponse(activeOrder) : null)
            .menuItems(menuItems)
            .build();
    }

    private int safeCategorySort(Integer sortOrder) {
        return sortOrder == null ? Integer.MAX_VALUE : sortOrder;
    }

    @Getter
    @Builder
    public static class TableResponse {
        private final UUID id;
        private final String tableNumber;
        private final Integer capacity;
        private final String status;
        private final PosOrderResponse currentOrder;
    }

    @Getter
    @Builder
    public static class PosOrderResponse {
        private final UUID id;
        private final String orderNumber;
        private final UUID tableId;
        private final String tableNumber;
        private final UUID customerId;
        private final String orderType;
        private final String status;
        private final String serviceStatus;
        private final String customerName;
        private final String customerPhone;
        private final String assignedStaffName;
        private final Integer guestCount;
        private final String notes;
        private final BigDecimal subtotal;
        private final BigDecimal discountAmount;
        private final BigDecimal loyaltyDiscountAmount;
        private final Integer loyaltyRedeemedPoints;
        private final String couponCode;
        private final Integer splitCount;
        private final BigDecimal taxAmount;
        private final BigDecimal totalAmount;
        private final LocalDateTime kotSentAt;
        private final LocalDateTime servedAt;
        private final LocalDateTime billRequestedAt;
        private final LocalDateTime paidAt;
        private final LocalDateTime createdAt;
        private final List<PosOrderPaymentResponse> payments;
        private final List<PosOrderLineResponse> items;
    }

    @Getter
    @Builder
    public static class PosOrderPaymentResponse {
        private final UUID id;
        private final String paymentMethod;
        private final BigDecimal amount;
        private final String referenceNumber;
    }

    @Getter
    @Builder
    public static class PosOrderLineResponse {
        private final UUID id;
        private final UUID itemId;
        private final String itemName;
        private final BigDecimal quantity;
        private final BigDecimal unitPrice;
        private final BigDecimal lineTotal;
        private final String notes;
    }

    @Getter
    @Builder
    public static class SavePosOrderRequest {
        private final String customerName;
        private final String customerPhone;
        private final String assignedStaffName;
        private final Integer guestCount;
        private final String notes;
        private final List<OrderLineRequest> items;
    }

    @Getter
    @Builder
    public static class OrderLineRequest {
        private final UUID itemId;
        private final BigDecimal quantity;
        private final String notes;
    }

    @Getter
    @Builder
    public static class SettlePosOrderRequest {
        private final BigDecimal discountAmount;
        private final BigDecimal taxAmount;
        private final String couponCode;
        private final Integer redeemPoints;
        private final List<PaymentRequest> payments;
    }

    @Getter
    @Builder
    public static class PaymentRequest {
        private final PosOrderPaymentEntity.PaymentMethod paymentMethod;
        private final BigDecimal amount;
        private final String referenceNumber;
    }

    @Getter
    @Builder
    public static class SplitLineRequest {
        private final UUID orderItemId;
        private final BigDecimal quantity;
    }

    @Getter
    @Builder
    public static class CashierShiftResponse {
        private final UUID shiftId;
        private final String status;
        private final BigDecimal openingCash;
        private final BigDecimal expectedCash;
        private final BigDecimal closingCash;
        private final BigDecimal varianceAmount;
        private final LocalDateTime openedAt;
        private final LocalDateTime closedAt;
        private final String notes;
        private final Map<String, BigDecimal> paymentTotals;
    }

    @Getter
    @Builder
    public static class OpenShiftRequest {
        private final BigDecimal openingCash;
        private final String notes;
    }

    @Getter
    @Builder
    public static class CloseShiftRequest {
        private final BigDecimal closingCash;
        private final String notes;
    }

    @Getter
    @Builder
    public static class UpdateServiceRequest {
        private final PosOrderEntity.ServiceStatus serviceStatus;
        private final String assignedStaffName;
        private final Integer guestCount;
    }

    @Getter
    @Builder
    public static class QrSessionResponse {
        private final UUID sessionId;
        private final String sessionToken;
        private final String status;
        private final UUID branchId;
        private final String branchName;
        private final UUID tableId;
        private final String tableNumber;
        private final Integer capacity;
        private final String publicPath;
        private final LocalDateTime expiresAt;
        private final LocalDateTime lastOrderedAt;
        private final String customerName;
        private final String customerPhone;
        private final String notes;
        private final PosOrderResponse activeOrder;
        private final List<QrMenuItemResponse> menuItems;
    }

    @Getter
    @Builder
    public static class QrMenuItemResponse {
        private final UUID id;
        private final String code;
        private final String name;
        private final String category;
        private final String unit;
        private final BigDecimal salePrice;
    }
}
