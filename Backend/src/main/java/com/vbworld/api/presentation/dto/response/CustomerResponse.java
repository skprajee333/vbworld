package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {
    private UUID id;
    private String name;
    private String phone;
    private String email;
    private UUID branchId;
    private String branchName;
    private Integer totalVisits;
    private BigDecimal totalSpend;
    private Integer pointsBalance;
    private Integer lifetimePointsEarned;
    private Integer lifetimePointsRedeemed;
    private LocalDateTime lastVisitAt;
    private List<OrderSummary> recentOrders;
    private List<LoyaltyTransactionSummary> loyaltyTransactions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderSummary {
        private UUID id;
        private String orderNumber;
        private String tableNumber;
        private BigDecimal totalAmount;
        private String paymentMethods;
        private LocalDateTime paidAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoyaltyTransactionSummary {
        private UUID id;
        private String transactionType;
        private Integer points;
        private BigDecimal amountValue;
        private String branchName;
        private String orderNumber;
        private String createdByName;
        private String notes;
        private LocalDateTime createdAt;
    }
}
