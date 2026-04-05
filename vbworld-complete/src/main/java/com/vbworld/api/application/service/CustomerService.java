package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.BusinessException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.BranchEntity;
import com.vbworld.api.infrastructure.entity.CustomerEntity;
import com.vbworld.api.infrastructure.entity.CustomerLoyaltyTransactionEntity;
import com.vbworld.api.infrastructure.entity.PosOrderEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.CustomerLoyaltyTransactionRepository;
import com.vbworld.api.infrastructure.repository.CustomerRepository;
import com.vbworld.api.infrastructure.repository.PosOrderRepository;
import com.vbworld.api.presentation.dto.response.CustomerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private static final BigDecimal LOYALTY_EARNING_UNIT = BigDecimal.valueOf(100);

    private final CustomerRepository customerRepository;
    private final CustomerLoyaltyTransactionRepository customerLoyaltyTransactionRepository;
    private final PosOrderRepository posOrderRepository;
    private final GovernanceService governanceService;

    @Transactional(readOnly = true)
    public List<CustomerResponse> listCustomers(String search, UserEntity currentUser) {
        UserEntity user = requireCustomerAccess(currentUser);
        String normalizedSearch = search != null && search.isBlank() ? null : search;
        List<CustomerEntity> customers;
        if (user.isRestaurant()) {
            customers = normalizedSearch == null
                ? customerRepository.findTop50ByBranch_IdOrderByLastVisitAtDesc(user.getBranch().getId())
                : customerRepository.searchByBranch(user.getBranch().getId(), normalizedSearch);
        } else {
            customers = normalizedSearch == null
                ? customerRepository.findTop50ByOrderByLastVisitAtDesc()
                : customerRepository.searchAll(normalizedSearch);
        }

        return customers.stream()
            .map(customer -> toResponse(customer, false))
            .toList();
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomer(UUID customerId, UserEntity currentUser) {
        UserEntity user = requireCustomerAccess(currentUser);
        CustomerEntity customer = customerRepository.findById(customerId)
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + customerId));
        if (user.isRestaurant() && (customer.getBranch() == null || !customer.getBranch().getId().equals(user.getBranch().getId()))) {
            throw new AccessDeniedException("Customer does not belong to your branch");
        }
        return toResponse(customer, true);
    }

    @Transactional
    public CustomerEntity resolvePosCustomer(String customerName, String phone, BranchEntity branch) {
        String normalizedPhone = normalizePhone(phone);
        if (normalizedPhone == null) {
            return null;
        }

        CustomerEntity customer = customerRepository.findByPhone(normalizedPhone).orElse(null);
        if (customer == null) {
            customer = CustomerEntity.builder()
                .name(customerName != null && !customerName.isBlank() ? customerName.trim() : "Guest Customer")
                .phone(normalizedPhone)
                .branch(branch)
                .build();
        } else {
            if (customer.getName() == null || customer.getName().isBlank()) {
                customer.setName(customerName != null && !customerName.isBlank() ? customerName.trim() : "Guest Customer");
            } else if (customerName != null && !customerName.isBlank()) {
                customer.setName(customerName.trim());
            }
            if (customer.getBranch() == null) {
                customer.setBranch(branch);
            }
        }
        return customerRepository.save(customer);
    }

    @Transactional
    public void applyPosSettlement(CustomerEntity customer, PosOrderEntity order, int redeemedPoints, UserEntity currentUser) {
        if (customer == null) {
            return;
        }

        BigDecimal totalAmount = safe(order.getTotalAmount());
        customer.setBranch(customer.getBranch() != null ? customer.getBranch() : order.getBranch());
        customer.setLastVisitAt(order.getPaidAt());
        customer.setTotalVisits(customer.getTotalVisits() + 1);
        customer.setTotalSpend(safe(customer.getTotalSpend()).add(totalAmount).setScale(2, RoundingMode.HALF_UP));

        if (redeemedPoints > 0) {
            if (customer.getPointsBalance() < redeemedPoints) {
                throw new BusinessException("Customer does not have enough loyalty points");
            }
            customer.setPointsBalance(customer.getPointsBalance() - redeemedPoints);
            customer.setLifetimePointsRedeemed(customer.getLifetimePointsRedeemed() + redeemedPoints);
            customerLoyaltyTransactionRepository.save(CustomerLoyaltyTransactionEntity.builder()
                .customer(customer)
                .branch(order.getBranch())
                .order(order)
                .transactionType(CustomerLoyaltyTransactionEntity.TransactionType.REDEEM)
                .points(-redeemedPoints)
                .amountValue(BigDecimal.valueOf(redeemedPoints).setScale(2, RoundingMode.HALF_UP))
                .notes("Redeemed during POS settlement")
                .createdBy(currentUser)
                .build());
        }

        int earnedPoints = totalAmount.divide(LOYALTY_EARNING_UNIT, 0, RoundingMode.DOWN).intValue();
        if (earnedPoints > 0) {
            customer.setPointsBalance(customer.getPointsBalance() + earnedPoints);
            customer.setLifetimePointsEarned(customer.getLifetimePointsEarned() + earnedPoints);
            customerLoyaltyTransactionRepository.save(CustomerLoyaltyTransactionEntity.builder()
                .customer(customer)
                .branch(order.getBranch())
                .order(order)
                .transactionType(CustomerLoyaltyTransactionEntity.TransactionType.EARN)
                .points(earnedPoints)
                .amountValue(totalAmount)
                .notes("Earned from POS settlement")
                .createdBy(currentUser)
                .build());
        }

        customerRepository.save(customer);
        governanceService.logAction(
            currentUser,
            "CRM",
            "CUSTOMER_LOYALTY_UPDATED",
            "CUSTOMER",
            customer.getId(),
            "Updated customer loyalty for " + customer.getName(),
            "earned=" + earnedPoints + ", redeemed=" + redeemedPoints);
    }

    private CustomerResponse toResponse(CustomerEntity customer, boolean includeHistory) {
        List<CustomerResponse.OrderSummary> recentOrders = includeHistory
            ? posOrderRepository.findTop20ByCustomer_IdOrderByPaidAtDesc(customer.getId()).stream()
                .map(order -> CustomerResponse.OrderSummary.builder()
                    .id(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .tableNumber(order.getTable() != null ? order.getTable().getTableNumber() : null)
                    .totalAmount(order.getTotalAmount())
                    .paymentMethods(order.getPayments().stream()
                        .map(payment -> payment.getPaymentMethod().name())
                        .distinct()
                        .reduce((left, right) -> left + ", " + right)
                        .orElse(null))
                    .paidAt(order.getPaidAt())
                    .build())
                .toList()
            : null;

        List<CustomerResponse.LoyaltyTransactionSummary> transactions = includeHistory
            ? customerLoyaltyTransactionRepository.findTop30ByCustomer_IdOrderByCreatedAtDesc(customer.getId()).stream()
                .map(tx -> CustomerResponse.LoyaltyTransactionSummary.builder()
                    .id(tx.getId())
                    .transactionType(tx.getTransactionType().name())
                    .points(tx.getPoints())
                    .amountValue(tx.getAmountValue())
                    .branchName(tx.getBranch() != null ? tx.getBranch().getName() : null)
                    .orderNumber(tx.getOrder() != null ? tx.getOrder().getOrderNumber() : null)
                    .createdByName(tx.getCreatedBy() != null ? tx.getCreatedBy().getName() : null)
                    .notes(tx.getNotes())
                    .createdAt(tx.getCreatedAt())
                    .build())
                .toList()
            : null;

        return CustomerResponse.builder()
            .id(customer.getId())
            .name(customer.getName())
            .phone(customer.getPhone())
            .email(customer.getEmail())
            .branchId(customer.getBranch() != null ? customer.getBranch().getId() : null)
            .branchName(customer.getBranch() != null ? customer.getBranch().getName() : null)
            .totalVisits(customer.getTotalVisits())
            .totalSpend(customer.getTotalSpend())
            .pointsBalance(customer.getPointsBalance())
            .lifetimePointsEarned(customer.getLifetimePointsEarned())
            .lifetimePointsRedeemed(customer.getLifetimePointsRedeemed())
            .lastVisitAt(customer.getLastVisitAt())
            .recentOrders(recentOrders)
            .loyaltyTransactions(transactions)
            .build();
    }

    private UserEntity requireCustomerAccess(UserEntity currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (!(currentUser.isRestaurant() || currentUser.isWarehouseAdmin() || currentUser.isAdmin())) {
            throw new AccessDeniedException("You do not have access to customers");
        }
        if (currentUser.isRestaurant() && currentUser.getBranch() == null) {
            throw new AccessDeniedException("Branch access is required");
        }
        return currentUser;
    }

    private String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return null;
        }
        String digitsOnly = phone.replaceAll("[^0-9]", "");
        return digitsOnly.isBlank() ? null : digitsOnly;
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
