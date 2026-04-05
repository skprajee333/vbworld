package com.vbworld.api.presentation.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class AnalyticsResponse {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DashboardSummary {
        private long todayTotal;
        private long pending;
        private long inTransit;
        private long deliveredToday;
        private long cancelledToday;
        private long lowStockCount;
        private Double avgDeliveryHours;
        private Double fulfilmentPct;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DailyPoint {
        private String date;
        private long totalIndents;
        private long delivered;
        private long pending;
        private double totalQty;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BranchSummary {
        private String branchId;
        private String branchName;
        private long totalIndents;
        private long delivered;
        private double totalQty;
        private Double fulfilmentPct;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TopItem {
        private String itemId;
        private String itemName;
        private String itemCode;
        private String category;
        private String unit;
        private double totalRequested;
        private long orderCount;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReportSummary {
        private int days;
        private long totalOrders;
        private long deliveredOrders;
        private long cancelledOrders;
        private long openOrders;
        private double totalRequestedQty;
        private Double fulfilmentPct;
        private Double avgItemsPerOrder;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BranchPerformanceReport {
        private String branchId;
        private String branchName;
        private long totalOrders;
        private long deliveredOrders;
        private long cancelledOrders;
        private long openOrders;
        private double totalRequestedQty;
        private Double fulfilmentPct;
        private Double avgItemsPerOrder;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InventoryRiskReport {
        private String itemId;
        private String itemCode;
        private String itemName;
        private String category;
        private String unit;
        private double currentStock;
        private double minLevel;
        private Double maxLevel;
        private double reorderLevel;
        private Double averageDailyDemand;
        private Double estimatedDaysCover;
        private double suggestedOrderQty;
        private String riskLevel;
        private String recommendedSupplierName;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class WastageReport {
        private String itemId;
        private String itemCode;
        private String itemName;
        private String category;
        private String unit;
        private double totalWastageQty;
        private double deadStockQty;
        private long wastageEvents;
        private String topReasonType;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ExecutiveSummary {
        private int days;
        private long totalOrders;
        private Double fulfilmentPct;
        private Double onTimeDeliveryPct;
        private Double averageFulfilmentHours;
        private long lowStockItems;
        private long expiringLots;
        private double wastageQty;
        private double deadStockQty;
        private long openPurchaseOrders;
        private long dispatchedRoutes;
        private long completedRoutes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SlaReport {
        private String branchId;
        private String branchName;
        private long totalDeliveredOrders;
        private long onTimeOrders;
        private long lateOrders;
        private Double onTimePct;
        private Double averageFulfilmentHours;
        private Double averageApprovalHours;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class StockAgingReport {
        private String itemId;
        private String itemCode;
        private String itemName;
        private String category;
        private String unit;
        private String batchNumber;
        private String supplierName;
        private String receivedDate;
        private String expiryDate;
        private double remainingQuantity;
        private Integer ageDays;
        private String ageBucket;
        private String stockStatus;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CashierReconciliationReport {
        private String businessDate;
        private String branchId;
        private String branchName;
        private long totalBills;
        private double grossSales;
        private double discountTotal;
        private double taxTotal;
        private double netSales;
        private Double averageBillValue;
        private double expectedCash;
        private Double actualCash;
        private Double varianceAmount;
        private long openShifts;
        private long closedShifts;
        private long splitBills;
        private long couponBills;
        private java.util.Map<String, Double> paymentTotals;
        private java.util.List<CashierShiftReport> shifts;
        private java.util.List<CashierSettlementReport> settlements;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CashierShiftReport {
        private String shiftId;
        private String cashierId;
        private String cashierName;
        private String status;
        private String openedAt;
        private String closedAt;
        private double openingCash;
        private Double expectedCash;
        private Double closingCash;
        private Double varianceAmount;
        private long totalBills;
        private double netSales;
        private java.util.Map<String, Double> paymentTotals;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CashierSettlementReport {
        private String orderId;
        private String orderNumber;
        private String cashierName;
        private String tableNumber;
        private String paidAt;
        private double subtotal;
        private double discountAmount;
        private double taxAmount;
        private double totalAmount;
        private String couponCode;
        private int splitCount;
        private String paymentMethods;
        private String paymentReferences;
    }
}
