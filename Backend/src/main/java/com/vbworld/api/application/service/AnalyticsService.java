package com.vbworld.api.application.service;

import com.vbworld.api.infrastructure.entity.SupplierItemMappingEntity;
import com.vbworld.api.infrastructure.entity.WarehouseStockEntity;
import com.vbworld.api.infrastructure.repository.IndentRepository;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.PosCashierShiftRepository;
import com.vbworld.api.infrastructure.repository.PosOrderRepository;
import com.vbworld.api.infrastructure.repository.SupplierItemMappingRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockLotRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockRepository;
import com.vbworld.api.infrastructure.entity.IndentEntity.Status;
import com.vbworld.api.infrastructure.entity.PosCashierShiftEntity;
import com.vbworld.api.infrastructure.entity.PosOrderEntity;
import com.vbworld.api.infrastructure.entity.PosOrderPaymentEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.entity.WarehouseStockLotEntity;
import com.vbworld.api.presentation.dto.response.AnalyticsResponse;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final IndentRepository indentRepository;
    private final BranchRepository branchRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final SupplierItemMappingRepository supplierItemMappingRepository;
    private final PosOrderRepository posOrderRepository;
    private final PosCashierShiftRepository posCashierShiftRepository;
    private final WarehouseStockLotRepository warehouseStockLotRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final DateTimeFormatter TIMESTAMP_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    // ─── DASHBOARD SUMMARY ───────────────────────────────────
    @Transactional(readOnly = true)
    public AnalyticsResponse.DashboardSummary getDashboardSummary(UserEntity currentUser) {

        UUID branchId = resolveAnalyticsBranchScope(currentUser);
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();

        String sql = """
            SELECT
                COUNT(*) FILTER (WHERE i.status IN ('SUBMITTED', 'APPROVED', 'DISPATCHED', 'DELIVERED') AND i.created_at >= :todayStart),
                COUNT(*) FILTER (WHERE i.status = 'SUBMITTED'),
                COUNT(*) FILTER (WHERE i.status = 'DISPATCHED'),
                COUNT(*) FILTER (WHERE i.status = 'DELIVERED' AND i.created_at >= :todayStart),
                COUNT(*) FILTER (WHERE i.status = 'CANCELLED' AND i.created_at >= :todayStart),
                COUNT(*) FILTER (WHERE i.status = 'DELIVERED'),
                COUNT(*) FILTER (WHERE i.status = 'CANCELLED')
            FROM indents i
            WHERE 1=1
            """ + (branchId != null ? "\n  AND i.branch_id = :branchId" : "");

        var query = entityManager.createNativeQuery(sql)
            .setParameter("todayStart", todayStart);
        if (branchId != null) {
            query.setParameter("branchId", branchId);
        }

        Object[] row = (Object[]) query.getSingleResult();

        long todayTotal = toLong(row[0]);
        long pending = toLong(row[1]);
        long inTransit = toLong(row[2]);
        long deliveredToday = toLong(row[3]);
        long cancelledToday = toLong(row[4]);
        long deliveredTotal = toLong(row[5]);
        long cancelledTotal = toLong(row[6]);
        long lowStockCount = branchId == null ? warehouseStockRepository.countByQuantityLessThanEqualMinLevel() : 0;
        long resolvedCount = deliveredTotal + cancelledTotal;

        return AnalyticsResponse.DashboardSummary.builder()
                .todayTotal(todayTotal)
                .pending(pending)
                .inTransit(inTransit)
                .deliveredToday(deliveredToday)
                .cancelledToday(cancelledToday)
                .lowStockCount(lowStockCount)
                .fulfilmentPct(resolvedCount == 0 ? 100.0 : round(deliveredTotal * 100.0 / resolvedCount, 1))
                .build();
    }

    // ─── DAILY TREND ─────────────────────────────────────────
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<AnalyticsResponse.DailyPoint> getDailyTrend(int days, UserEntity currentUser) {

        UUID branchId = resolveAnalyticsBranchScope(currentUser);
        LocalDate startDate = LocalDate.now().minusDays(days);

        String sql = """
            SELECT
                gs.date,
                COALESCE(s.total_indents, 0),
                COALESCE(s.delivered, 0),
                COALESCE(s.pending, 0),
                COALESCE(s.total_qty, 0)
            FROM generate_series(
                ?,
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS gs(date)
            LEFT JOIN (
                SELECT
                    DATE(i.created_at) AS date,
                    COUNT(*) AS total_indents,
                    COUNT(*) FILTER (WHERE i.status = 'DELIVERED') AS delivered,
                    COUNT(*) FILTER (
                        WHERE i.status IN ('SUBMITTED','APPROVED','DISPATCHED')
                    ) AS pending,
                    COALESCE(SUM(ii.requested_qty), 0) AS total_qty
                FROM indents i
                LEFT JOIN indent_items ii ON ii.indent_id = i.id
                WHERE i.created_at >= ?
                %s
                GROUP BY DATE(i.created_at)
            ) s ON s.date = gs.date
            ORDER BY gs.date
        """.formatted(branchId != null ? "  AND i.branch_id = ?" : "");

        var query = entityManager.createNativeQuery(sql);

        query.setParameter(1, Date.valueOf(startDate));
        query.setParameter(2, Date.valueOf(startDate));
        if (branchId != null) {
            query.setParameter(3, branchId);
        }

        var results = query.getResultList();

        List<AnalyticsResponse.DailyPoint> list = new ArrayList<>();

        for (Object row : results) {
            Object[] c = (Object[]) row;

            list.add(AnalyticsResponse.DailyPoint.builder()
                    .date(c[0].toString())
                    .totalIndents(((Number) c[1]).longValue())
                    .delivered(((Number) c[2]).longValue())
                    .pending(((Number) c[3]).longValue())
                    .totalQty(((Number) c[4]).doubleValue())
                    .build());
        }

        return list;
    }

    // ─── BRANCH SUMMARY ──────────────────────────────────────
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<AnalyticsResponse.BranchSummary> getBranchSummary(UserEntity currentUser) {

        UUID branchId = resolveAnalyticsBranchScope(currentUser);

    	String sql = """
    		    SELECT
    		        CAST(b.id AS TEXT),
    		        b.name,
    		        COUNT(i.id),
    		        COUNT(i.id) FILTER (WHERE i.status = 'DELIVERED'),
    		        COALESCE(SUM(ii.requested_qty), 0),
    		        ROUND(
    		            CAST(COUNT(i.id) FILTER (WHERE i.status='DELIVERED') AS numeric)
    		            / NULLIF(COUNT(i.id),0) * 100,
    		            1
    		        )
    		    FROM branches b
    		    LEFT JOIN indents i ON i.branch_id = b.id
    		        AND i.created_at >= CURRENT_DATE - INTERVAL '7 days'
    		    LEFT JOIN indent_items ii ON ii.indent_id = i.id
    		    WHERE b.is_active = TRUE
                %s
    		    GROUP BY b.id, b.name
    		    ORDER BY COUNT(i.id) DESC
    		""".formatted(branchId != null ? "  AND b.id = :branchId" : "");

        var query = entityManager.createNativeQuery(sql);
        if (branchId != null) {
            query.setParameter("branchId", branchId);
        }
        var results = query.getResultList();

        List<AnalyticsResponse.BranchSummary> list = new ArrayList<>();

        for (Object row : results) {
            Object[] c = (Object[]) row;

            list.add(AnalyticsResponse.BranchSummary.builder()
                    .branchId(c[0].toString())
                    .branchName(c[1].toString())
                    .totalIndents(((Number) c[2]).longValue())
                    .delivered(((Number) c[3]).longValue())
                    .totalQty(((Number) c[4]).doubleValue())
                    .fulfilmentPct(c[5] != null ? ((Number) c[5]).doubleValue() : null)
                    .build());
        }

        return list;
    }

    // ─── TOP ITEMS ───────────────────────────────────────────
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<AnalyticsResponse.TopItem> getTopItems(int days, int limit, UserEntity currentUser) {

        UUID branchId = resolveAnalyticsBranchScope(currentUser);
        LocalDate startDate = LocalDate.now().minusDays(days);

        String sql = """
            SELECT
                it.id,
                it.name,
                it.code,
                c.name,
                it.unit,
                COALESCE(SUM(ii.requested_qty), 0),
                COUNT(DISTINCT i.id)
            FROM indent_items ii
            JOIN indents i  ON i.id = ii.indent_id
            JOIN items it   ON it.id = ii.item_id
            LEFT JOIN categories c ON c.id = it.category_id
            WHERE i.created_at >= ?
            %s
            GROUP BY it.id, it.name, it.code, c.name, it.unit
            ORDER BY COALESCE(SUM(ii.requested_qty), 0) DESC
            LIMIT ?
        """.formatted(branchId != null ? "  AND i.branch_id = ?" : "");

        var query = entityManager.createNativeQuery(sql)
                .setParameter(1, Date.valueOf(startDate));
        if (branchId != null) {
            query.setParameter(2, branchId);
            query.setParameter(3, limit);
        } else {
            query.setParameter(2, limit);
        }
        var results = query.getResultList();

        List<AnalyticsResponse.TopItem> list = new ArrayList<>();

        for (Object row : results) {
            Object[] c = (Object[]) row;

            list.add(AnalyticsResponse.TopItem.builder()
                    .itemId(c[0].toString())
                    .itemName(c[1].toString())
                    .itemCode(c[2].toString())
                    .category(c[3] != null ? c[3].toString() : null)
                    .unit(c[4].toString())
                    .totalRequested(((Number) c[5]).doubleValue())
                    .orderCount(((Number) c[6]).longValue())
                    .build());
        }

        return list;
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse.ReportSummary getReportSummary(int days, UserEntity currentUser) {
        UUID branchId = resolveAnalyticsBranchScope(currentUser);
        int normalizedDays = Math.max(1, Math.min(days, 180));
        LocalDate startDate = LocalDate.now().minusDays(normalizedDays);

        String sql = """
            SELECT
                COUNT(DISTINCT i.id) AS total_orders,
                COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'DELIVERED') AS delivered_orders,
                COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'CANCELLED') AS cancelled_orders,
                COUNT(DISTINCT i.id) FILTER (
                    WHERE i.status IN ('SUBMITTED', 'APPROVED', 'DISPATCHED')
                ) AS open_orders,
                COALESCE(SUM(ii.requested_qty), 0) AS total_requested_qty,
                ROUND(COALESCE(AVG(item_counts.item_count), 0), 2) AS avg_items_per_order
            FROM indents i
            LEFT JOIN indent_items ii ON ii.indent_id = i.id
            LEFT JOIN (
                SELECT indent_id, COUNT(*) AS item_count
                FROM indent_items
                GROUP BY indent_id
            ) item_counts ON item_counts.indent_id = i.id
            WHERE i.created_at >= :startDate
            """ + (branchId != null ? "\n  AND i.branch_id = :branchId" : "");

        var query = entityManager.createNativeQuery(sql)
            .setParameter("startDate", Date.valueOf(startDate));
        if (branchId != null) {
            query.setParameter("branchId", branchId);
        }
        Object[] row = (Object[]) query.getSingleResult();

        long totalOrders = toLong(row[0]);
        long deliveredOrders = toLong(row[1]);
        long cancelledOrders = toLong(row[2]);
        long openOrders = toLong(row[3]);
        double totalRequestedQty = toDouble(row[4]);
        Double fulfilmentPct = totalOrders == 0
            ? 100.0
            : round(deliveredOrders * 100.0 / totalOrders, 1);

        return AnalyticsResponse.ReportSummary.builder()
            .days(normalizedDays)
            .totalOrders(totalOrders)
            .deliveredOrders(deliveredOrders)
            .cancelledOrders(cancelledOrders)
            .openOrders(openOrders)
            .totalRequestedQty(totalRequestedQty)
            .fulfilmentPct(fulfilmentPct)
            .avgItemsPerOrder(toNullableDouble(row[5]))
            .build();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<AnalyticsResponse.BranchPerformanceReport> getBranchPerformanceReport(int days, UserEntity currentUser) {
        UUID branchId = resolveAnalyticsBranchScope(currentUser);
        int normalizedDays = Math.max(1, Math.min(days, 180));
        LocalDate startDate = LocalDate.now().minusDays(normalizedDays);

        String sql = """
            SELECT
                CAST(b.id AS TEXT),
                b.name,
                COUNT(DISTINCT i.id) AS total_orders,
                COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'DELIVERED') AS delivered_orders,
                COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'CANCELLED') AS cancelled_orders,
                COUNT(DISTINCT i.id) FILTER (
                    WHERE i.status IN ('SUBMITTED', 'APPROVED', 'DISPATCHED')
                ) AS open_orders,
                COALESCE(SUM(ii.requested_qty), 0) AS total_requested_qty,
                ROUND(
                    CAST(COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'DELIVERED') AS numeric)
                    / NULLIF(COUNT(DISTINCT i.id), 0) * 100,
                    1
                ) AS fulfilment_pct,
                ROUND(COALESCE(AVG(item_counts.item_count), 0), 2) AS avg_items_per_order
            FROM branches b
            LEFT JOIN indents i
                ON i.branch_id = b.id
               AND i.created_at >= :startDate
            LEFT JOIN indent_items ii
                ON ii.indent_id = i.id
            LEFT JOIN (
                SELECT indent_id, COUNT(*) AS item_count
                FROM indent_items
                GROUP BY indent_id
            ) item_counts
                ON item_counts.indent_id = i.id
            WHERE b.is_active = TRUE
            %s
            GROUP BY b.id, b.name
            ORDER BY COUNT(DISTINCT i.id) DESC, b.name
            """.formatted(branchId != null ? "  AND b.id = :branchId" : "");

        var query = entityManager.createNativeQuery(sql)
            .setParameter("startDate", Date.valueOf(startDate));
        if (branchId != null) {
            query.setParameter("branchId", branchId);
        }
        List<Object[]> rows = query.getResultList();

        List<AnalyticsResponse.BranchPerformanceReport> list = new ArrayList<>();
        for (Object[] row : rows) {
            list.add(AnalyticsResponse.BranchPerformanceReport.builder()
                .branchId(text(row[0]))
                .branchName(text(row[1]))
                .totalOrders(toLong(row[2]))
                .deliveredOrders(toLong(row[3]))
                .cancelledOrders(toLong(row[4]))
                .openOrders(toLong(row[5]))
                .totalRequestedQty(toDouble(row[6]))
                .fulfilmentPct(toNullableDouble(row[7]))
                .avgItemsPerOrder(toNullableDouble(row[8]))
                .build());
        }
        return list;
    }

    @Transactional(readOnly = true)
    public List<AnalyticsResponse.InventoryRiskReport> getInventoryRiskReport(UserEntity currentUser) {
        requireAnalyticsAccess(currentUser);
        if (!canViewWarehouseAnalytics(currentUser)) {
            return List.of();
        }
        List<WarehouseStockEntity> stocks = warehouseStockRepository.findAllWithItems();
        if (stocks.isEmpty()) {
            return List.of();
        }

        List<UUID> itemIds = stocks.stream()
            .map(stock -> stock.getItem().getId())
            .toList();
        Map<UUID, BigDecimal> demandByItem = getAverageDailyDemand(itemIds);
        Map<UUID, SupplierItemMappingEntity> bestMappingByItem = getBestMappingByItem(itemIds);

        return stocks.stream()
            .map(stock -> {
                BigDecimal currentStock = zeroIfNull(stock.getQuantity());
                BigDecimal minLevel = zeroIfNull(stock.getMinLevel());
                BigDecimal reorderLevel = zeroIfNull(stock.getItem().getReorderLevel());
                BigDecimal maxLevel = stock.getMaxLevel();
                BigDecimal avgDailyDemand = demandByItem.get(stock.getItem().getId());
                Double daysCover = (avgDailyDemand != null && avgDailyDemand.compareTo(BigDecimal.ZERO) > 0)
                    ? currentStock.divide(avgDailyDemand, 1, RoundingMode.HALF_UP).doubleValue()
                    : null;
                BigDecimal suggestedOrderQty = resolveSuggestedOrderQty(currentStock, minLevel, reorderLevel, maxLevel);
                String riskLevel = resolveRiskLevel(currentStock, minLevel, daysCover);
                SupplierItemMappingEntity mapping = bestMappingByItem.get(stock.getItem().getId());

                return AnalyticsResponse.InventoryRiskReport.builder()
                    .itemId(stock.getItem().getId().toString())
                    .itemCode(stock.getItem().getCode())
                    .itemName(stock.getItem().getName())
                    .category(stock.getItem().getCategory() != null ? stock.getItem().getCategory().getName() : null)
                    .unit(stock.getItem().getUnit())
                    .currentStock(currentStock.doubleValue())
                    .minLevel(minLevel.doubleValue())
                    .maxLevel(maxLevel != null ? maxLevel.doubleValue() : null)
                    .reorderLevel(reorderLevel.doubleValue())
                    .averageDailyDemand(avgDailyDemand != null ? avgDailyDemand.doubleValue() : null)
                    .estimatedDaysCover(daysCover)
                    .suggestedOrderQty(suggestedOrderQty.doubleValue())
                    .riskLevel(riskLevel)
                    .recommendedSupplierName(mapping != null ? mapping.getSupplier().getName() : null)
                    .build();
            })
            .sorted((left, right) -> {
                int riskCompare = Integer.compare(riskRank(left.getRiskLevel()), riskRank(right.getRiskLevel()));
                if (riskCompare != 0) {
                    return riskCompare;
                }
                return Double.compare(right.getSuggestedOrderQty(), left.getSuggestedOrderQty());
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public String exportBranchPerformanceCsv(int days, UserEntity currentUser) {
        List<AnalyticsResponse.BranchPerformanceReport> rows = getBranchPerformanceReport(days, currentUser);
        StringBuilder csv = new StringBuilder()
            .append("Branch,Total Orders,Delivered,Cancelled,Open,Requested Qty,Fulfilment %,Avg Items/Order\n");
        for (AnalyticsResponse.BranchPerformanceReport row : rows) {
            csv.append(csv(row.getBranchName())).append(',')
                .append(row.getTotalOrders()).append(',')
                .append(row.getDeliveredOrders()).append(',')
                .append(row.getCancelledOrders()).append(',')
                .append(row.getOpenOrders()).append(',')
                .append(row.getTotalRequestedQty()).append(',')
                .append(row.getFulfilmentPct() != null ? row.getFulfilmentPct() : "").append(',')
                .append(row.getAvgItemsPerOrder() != null ? row.getAvgItemsPerOrder() : "")
                .append('\n');
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String exportInventoryRiskCsv(UserEntity currentUser) {
        List<AnalyticsResponse.InventoryRiskReport> rows = getInventoryRiskReport(currentUser);
        StringBuilder csv = new StringBuilder()
            .append("Item Code,Item Name,Category,Unit,Current Stock,Min Level,Reorder Level,Max Level,Avg Daily Demand,Days Cover,Suggested Order Qty,Risk Level,Recommended Supplier\n");
        for (AnalyticsResponse.InventoryRiskReport row : rows) {
            csv.append(csv(row.getItemCode())).append(',')
                .append(csv(row.getItemName())).append(',')
                .append(csv(row.getCategory())).append(',')
                .append(csv(row.getUnit())).append(',')
                .append(row.getCurrentStock()).append(',')
                .append(row.getMinLevel()).append(',')
                .append(row.getReorderLevel()).append(',')
                .append(row.getMaxLevel() != null ? row.getMaxLevel() : "").append(',')
                .append(row.getAverageDailyDemand() != null ? row.getAverageDailyDemand() : "").append(',')
                .append(row.getEstimatedDaysCover() != null ? row.getEstimatedDaysCover() : "").append(',')
                .append(row.getSuggestedOrderQty()).append(',')
                .append(csv(row.getRiskLevel())).append(',')
                .append(csv(row.getRecommendedSupplierName()))
                .append('\n');
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<AnalyticsResponse.WastageReport> getWastageReport(int days, UserEntity currentUser) {
        requireAnalyticsAccess(currentUser);
        if (!canViewWarehouseAnalytics(currentUser)) {
            return List.of();
        }
        int normalizedDays = Math.max(1, Math.min(days, 180));
        LocalDateTime startAt = LocalDate.now().minusDays(normalizedDays).atStartOfDay();

        String sql = """
            SELECT
                CAST(i.id AS TEXT),
                i.code,
                i.name,
                c.name,
                i.unit,
                COALESCE(SUM(CASE WHEN a.impact_type = 'WASTAGE' THEN ABS(a.quantity_delta) ELSE 0 END), 0) AS wastage_qty,
                COALESCE(SUM(CASE WHEN a.impact_type = 'DEAD_STOCK' THEN ABS(a.quantity_delta) ELSE 0 END), 0) AS dead_stock_qty,
                COUNT(a.id) AS event_count,
                COALESCE(
                    MAX(CASE WHEN a.reason_type IN ('WASTAGE','SPOILAGE','EXPIRED','DAMAGE','DEAD_STOCK') THEN a.reason_type END),
                    'GENERAL'
                ) AS top_reason_type
            FROM warehouse_stock_adjustments a
            JOIN items i ON i.id = a.item_id
            LEFT JOIN categories c ON c.id = i.category_id
            WHERE a.adjusted_at >= :startAt
              AND a.impact_type IN ('WASTAGE', 'DEAD_STOCK')
            GROUP BY i.id, i.code, i.name, c.name, i.unit
            ORDER BY (COALESCE(SUM(ABS(a.quantity_delta)), 0)) DESC, i.name
            """;

        List<Object[]> rows = entityManager.createNativeQuery(sql)
            .setParameter("startAt", startAt)
            .getResultList();

        List<AnalyticsResponse.WastageReport> result = new ArrayList<>();
        for (Object[] row : rows) {
            result.add(AnalyticsResponse.WastageReport.builder()
                .itemId(text(row[0]))
                .itemCode(text(row[1]))
                .itemName(text(row[2]))
                .category(text(row[3]))
                .unit(text(row[4]))
                .totalWastageQty(toDouble(row[5]))
                .deadStockQty(toDouble(row[6]))
                .wastageEvents(toLong(row[7]))
                .topReasonType(text(row[8]))
                .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse.ExecutiveSummary getExecutiveSummary(int days, UserEntity currentUser) {
        UUID branchId = resolveAnalyticsBranchScope(currentUser);
        boolean warehouseAnalytics = canViewWarehouseAnalytics(currentUser);
        int normalizedDays = Math.max(1, Math.min(days, 180));
        LocalDateTime startAt = LocalDate.now().minusDays(normalizedDays).atStartOfDay();
        LocalDate routeStartDate = LocalDate.now().minusDays(normalizedDays);

        String orderSql = """
            SELECT
                COUNT(*) AS total_orders,
                COUNT(*) FILTER (WHERE i.status = 'DELIVERED') AS delivered_orders,
                COUNT(*) FILTER (
                    WHERE i.status = 'DELIVERED'
                      AND i.scheduled_delivery_date IS NOT NULL
                      AND DATE(i.delivered_at) <= i.scheduled_delivery_date
                ) AS on_time_orders,
                AVG(EXTRACT(EPOCH FROM (i.delivered_at - i.created_at)) / 3600.0)
                    FILTER (WHERE i.status = 'DELIVERED' AND i.delivered_at IS NOT NULL) AS avg_fulfilment_hours
            FROM indents i
            WHERE i.created_at >= :startAt
            """ + (branchId != null ? "\n  AND i.branch_id = :branchId" : "");

        var orderQuery = entityManager.createNativeQuery(orderSql)
            .setParameter("startAt", startAt);
        if (branchId != null) {
            orderQuery.setParameter("branchId", branchId);
        }
        Object[] orderRow = (Object[]) orderQuery.getSingleResult();

        long totalOrders = toLong(orderRow[0]);
        long deliveredOrders = toLong(orderRow[1]);
        long onTimeOrders = toLong(orderRow[2]);
        Double avgFulfilmentHours = toNullableDouble(orderRow[3]);

        List<AnalyticsResponse.WastageReport> wastage = getWastageReport(normalizedDays, currentUser);
        double wastageQty = wastage.stream().mapToDouble(AnalyticsResponse.WastageReport::getTotalWastageQty).sum();
        double deadStockQty = wastage.stream().mapToDouble(AnalyticsResponse.WastageReport::getDeadStockQty).sum();
        long expiringLots = warehouseAnalytics
            ? warehouseStockLotRepository.findExpiringBefore(LocalDate.now().plusDays(7)).size()
            : 0;

        String poSql = """
            SELECT COUNT(*) FROM purchase_orders
            WHERE po_status IN ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED')
            """;
        long openPurchaseOrders = warehouseAnalytics
            ? toLong(entityManager.createNativeQuery(poSql).getSingleResult())
            : 0;

        String routeSql = """
            SELECT
                COUNT(*) FILTER (WHERE route_status = 'DISPATCHED') AS dispatched_routes,
                COUNT(*) FILTER (WHERE route_status = 'COMPLETED') AS completed_routes
            FROM delivery_routes
            WHERE route_date >= :routeStartDate
            """;
        long dispatchedRoutes = 0;
        long completedRoutes = 0;
        if (warehouseAnalytics) {
            Object[] routeRow = (Object[]) entityManager.createNativeQuery(routeSql)
                .setParameter("routeStartDate", Date.valueOf(routeStartDate))
                .getSingleResult();
            dispatchedRoutes = toLong(routeRow[0]);
            completedRoutes = toLong(routeRow[1]);
        }

        return AnalyticsResponse.ExecutiveSummary.builder()
            .days(normalizedDays)
            .totalOrders(totalOrders)
            .fulfilmentPct(totalOrders == 0 ? 100.0 : round(deliveredOrders * 100.0 / totalOrders, 1))
            .onTimeDeliveryPct(deliveredOrders == 0 ? 100.0 : round(onTimeOrders * 100.0 / deliveredOrders, 1))
            .averageFulfilmentHours(avgFulfilmentHours)
            .lowStockItems(warehouseAnalytics ? warehouseStockRepository.countByQuantityLessThanEqualMinLevel() : 0)
            .expiringLots(expiringLots)
            .wastageQty(round(wastageQty, 2))
            .deadStockQty(round(deadStockQty, 2))
            .openPurchaseOrders(openPurchaseOrders)
            .dispatchedRoutes(dispatchedRoutes)
            .completedRoutes(completedRoutes)
            .build();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<AnalyticsResponse.SlaReport> getSlaReport(int days, UserEntity currentUser) {
        UUID branchId = resolveAnalyticsBranchScope(currentUser);
        int normalizedDays = Math.max(1, Math.min(days, 180));
        LocalDateTime startAt = LocalDate.now().minusDays(normalizedDays).atStartOfDay();

        String sql = """
            SELECT
                CAST(b.id AS TEXT),
                b.name,
                COUNT(i.id) FILTER (WHERE i.status = 'DELIVERED') AS delivered_orders,
                COUNT(i.id) FILTER (
                    WHERE i.status = 'DELIVERED'
                      AND i.scheduled_delivery_date IS NOT NULL
                      AND DATE(i.delivered_at) <= i.scheduled_delivery_date
                ) AS on_time_orders,
                AVG(EXTRACT(EPOCH FROM (i.delivered_at - i.created_at)) / 3600.0)
                    FILTER (WHERE i.status = 'DELIVERED' AND i.delivered_at IS NOT NULL) AS avg_fulfilment_hours,
                AVG(EXTRACT(EPOCH FROM (i.approved_at - i.created_at)) / 3600.0)
                    FILTER (WHERE i.approved_at IS NOT NULL) AS avg_approval_hours
            FROM branches b
            LEFT JOIN indents i
                ON i.branch_id = b.id
               AND i.created_at >= :startAt
            WHERE b.is_active = TRUE
            %s
            GROUP BY b.id, b.name
            ORDER BY delivered_orders DESC, b.name
            """.formatted(branchId != null ? "  AND b.id = :branchId" : "");

        var query = entityManager.createNativeQuery(sql)
            .setParameter("startAt", startAt);
        if (branchId != null) {
            query.setParameter("branchId", branchId);
        }
        List<Object[]> rows = query.getResultList();

        List<AnalyticsResponse.SlaReport> result = new ArrayList<>();
        for (Object[] row : rows) {
            long deliveredOrders = toLong(row[2]);
            long onTimeOrders = toLong(row[3]);
            result.add(AnalyticsResponse.SlaReport.builder()
                .branchId(text(row[0]))
                .branchName(text(row[1]))
                .totalDeliveredOrders(deliveredOrders)
                .onTimeOrders(onTimeOrders)
                .lateOrders(Math.max(0, deliveredOrders - onTimeOrders))
                .onTimePct(deliveredOrders == 0 ? null : round(onTimeOrders * 100.0 / deliveredOrders, 1))
                .averageFulfilmentHours(toNullableDouble(row[4]))
                .averageApprovalHours(toNullableDouble(row[5]))
                .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<AnalyticsResponse.StockAgingReport> getStockAgingReport(UserEntity currentUser) {
        requireAnalyticsAccess(currentUser);
        if (!canViewWarehouseAnalytics(currentUser)) {
            return List.of();
        }
        return warehouseStockLotRepository.findAllDetailed("").stream()
            .filter(lot -> lot.getRemainingQuantity() != null && lot.getRemainingQuantity().compareTo(BigDecimal.ZERO) > 0)
            .map(this::toStockAgingReport)
            .sorted((left, right) -> {
                int bucketCompare = Integer.compare(ageBucketRank(left.getAgeBucket()), ageBucketRank(right.getAgeBucket()));
                if (bucketCompare != 0) {
                    return bucketCompare;
                }
                return Integer.compare(right.getAgeDays() != null ? right.getAgeDays() : 0, left.getAgeDays() != null ? left.getAgeDays() : 0);
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public String exportExecutiveSummaryCsv(int days, UserEntity currentUser) {
        AnalyticsResponse.ExecutiveSummary summary = getExecutiveSummary(days, currentUser);
        StringBuilder csv = new StringBuilder()
            .append("Metric,Value\n")
            .append(csv("Days")).append(',').append(summary.getDays()).append('\n')
            .append(csv("Total orders")).append(',').append(summary.getTotalOrders()).append('\n')
            .append(csv("Fulfilment %")).append(',').append(summary.getFulfilmentPct() != null ? summary.getFulfilmentPct() : "").append('\n')
            .append(csv("On-time delivery %")).append(',').append(summary.getOnTimeDeliveryPct() != null ? summary.getOnTimeDeliveryPct() : "").append('\n')
            .append(csv("Average fulfilment hours")).append(',').append(summary.getAverageFulfilmentHours() != null ? summary.getAverageFulfilmentHours() : "").append('\n')
            .append(csv("Low stock items")).append(',').append(summary.getLowStockItems()).append('\n')
            .append(csv("Expiring lots")).append(',').append(summary.getExpiringLots()).append('\n')
            .append(csv("Wastage qty")).append(',').append(summary.getWastageQty()).append('\n')
            .append(csv("Dead stock qty")).append(',').append(summary.getDeadStockQty()).append('\n')
            .append(csv("Open purchase orders")).append(',').append(summary.getOpenPurchaseOrders()).append('\n')
            .append(csv("Dispatched routes")).append(',').append(summary.getDispatchedRoutes()).append('\n')
            .append(csv("Completed routes")).append(',').append(summary.getCompletedRoutes()).append('\n');
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String exportSlaCsv(int days, UserEntity currentUser) {
        List<AnalyticsResponse.SlaReport> rows = getSlaReport(days, currentUser);
        StringBuilder csv = new StringBuilder()
            .append("Branch,Delivered Orders,On-time Orders,Late Orders,On-time %,Avg Fulfilment Hours,Avg Approval Hours\n");
        for (AnalyticsResponse.SlaReport row : rows) {
            csv.append(csv(row.getBranchName())).append(',')
                .append(row.getTotalDeliveredOrders()).append(',')
                .append(row.getOnTimeOrders()).append(',')
                .append(row.getLateOrders()).append(',')
                .append(row.getOnTimePct() != null ? row.getOnTimePct() : "").append(',')
                .append(row.getAverageFulfilmentHours() != null ? row.getAverageFulfilmentHours() : "").append(',')
                .append(row.getAverageApprovalHours() != null ? row.getAverageApprovalHours() : "")
                .append('\n');
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String exportStockAgingCsv(UserEntity currentUser) {
        List<AnalyticsResponse.StockAgingReport> rows = getStockAgingReport(currentUser);
        StringBuilder csv = new StringBuilder()
            .append("Item Code,Item Name,Category,Unit,Batch,Supplier,Received Date,Expiry Date,Remaining Qty,Age Days,Age Bucket,Stock Status\n");
        for (AnalyticsResponse.StockAgingReport row : rows) {
            csv.append(csv(row.getItemCode())).append(',')
                .append(csv(row.getItemName())).append(',')
                .append(csv(row.getCategory())).append(',')
                .append(csv(row.getUnit())).append(',')
                .append(csv(row.getBatchNumber())).append(',')
                .append(csv(row.getSupplierName())).append(',')
                .append(csv(row.getReceivedDate())).append(',')
                .append(csv(row.getExpiryDate())).append(',')
                .append(row.getRemainingQuantity()).append(',')
                .append(row.getAgeDays() != null ? row.getAgeDays() : "").append(',')
                .append(csv(row.getAgeBucket())).append(',')
                .append(csv(row.getStockStatus()))
                .append('\n');
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse.CashierReconciliationReport getCashierReconciliationReport(LocalDate date, UserEntity currentUser) {
        UserEntity branchUser = requireBranchPosUser(currentUser);
        LocalDate businessDate = date != null ? date : LocalDate.now();
        UUID branchId = branchUser.getBranch().getId();
        String branchName = branchRepository.findById(branchId)
            .map(branch -> branch.getName())
            .orElseThrow(() -> new IllegalArgumentException("Branch not found: " + branchId));
        LocalDateTime from = businessDate.atStartOfDay();
        LocalDateTime to = businessDate.plusDays(1).atStartOfDay();

        List<PosOrderEntity> paidOrders = posOrderRepository.findByBranch_IdAndPaidAtBetweenOrderByPaidAtDesc(
            branchId, from, to);
        List<PosCashierShiftEntity> shifts = posCashierShiftRepository.findByBranch_IdAndOpenedAtBetweenOrderByOpenedAtDesc(
            branchId, from, to);

        BigDecimal grossSales = BigDecimal.ZERO;
        BigDecimal discountTotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        BigDecimal netSales = BigDecimal.ZERO;
        long splitBills = 0;
        long couponBills = 0;
        Map<String, BigDecimal> paymentTotals = initPaymentTotals();

        for (PosOrderEntity order : paidOrders) {
            grossSales = grossSales.add(safe(order.getSubtotal()));
            discountTotal = discountTotal.add(safe(order.getDiscountAmount()));
            taxTotal = taxTotal.add(safe(order.getTaxAmount()));
            netSales = netSales.add(safe(order.getTotalAmount()));
            if (order.getSplitCount() != null && order.getSplitCount() > 1) {
                splitBills++;
            }
            if (order.getCouponCode() != null && !order.getCouponCode().isBlank()) {
                couponBills++;
            }
            addPayments(paymentTotals, order.getPayments());
        }

        List<AnalyticsResponse.CashierShiftReport> shiftReports = shifts.stream()
            .map(shift -> toCashierShiftReport(shift, paidOrders))
            .toList();

        List<AnalyticsResponse.CashierSettlementReport> settlements = paidOrders.stream()
            .map(this::toCashierSettlementReport)
            .toList();

        BigDecimal expectedCash = shifts.stream()
            .map(PosCashierShiftEntity::getExpectedCash)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal actualCash = shifts.stream()
            .map(PosCashierShiftEntity::getClosingCash)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        long closedShifts = shifts.stream().filter(shift -> shift.getShiftStatus() == PosCashierShiftEntity.ShiftStatus.CLOSED).count();
        long openShifts = shifts.size() - closedShifts;

        return AnalyticsResponse.CashierReconciliationReport.builder()
            .businessDate(businessDate.toString())
            .branchId(branchId.toString())
            .branchName(branchName)
            .totalBills(paidOrders.size())
            .grossSales(grossSales.doubleValue())
            .discountTotal(discountTotal.doubleValue())
            .taxTotal(taxTotal.doubleValue())
            .netSales(netSales.doubleValue())
            .averageBillValue(paidOrders.isEmpty() ? null : round(netSales.divide(BigDecimal.valueOf(paidOrders.size()), 2, RoundingMode.HALF_UP).doubleValue(), 2))
            .expectedCash(expectedCash.doubleValue())
            .actualCash(shifts.stream().allMatch(shift -> shift.getClosingCash() == null) ? null : actualCash.doubleValue())
            .varianceAmount(shifts.stream().allMatch(shift -> shift.getVarianceAmount() == null)
                ? null
                : shifts.stream()
                    .map(PosCashierShiftEntity::getVarianceAmount)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .doubleValue())
            .openShifts(openShifts)
            .closedShifts(closedShifts)
            .splitBills(splitBills)
            .couponBills(couponBills)
            .paymentTotals(toDoubleMap(paymentTotals))
            .shifts(shiftReports)
            .settlements(settlements)
            .build();
    }

    @Transactional(readOnly = true)
    public String exportCashierReconciliationCsv(LocalDate date, UserEntity currentUser) {
        AnalyticsResponse.CashierReconciliationReport report = getCashierReconciliationReport(date, currentUser);
        StringBuilder csv = new StringBuilder()
            .append("Business Date,Branch,Cashier,Order Number,Table,Paid At,Subtotal,Discount,Tax,Total,Split Count,Coupon,Payment Methods,Payment References\n");
        for (AnalyticsResponse.CashierSettlementReport row : report.getSettlements()) {
            csv.append(csv(report.getBusinessDate())).append(',')
                .append(csv(report.getBranchName())).append(',')
                .append(csv(row.getCashierName())).append(',')
                .append(csv(row.getOrderNumber())).append(',')
                .append(csv(row.getTableNumber())).append(',')
                .append(csv(row.getPaidAt())).append(',')
                .append(row.getSubtotal()).append(',')
                .append(row.getDiscountAmount()).append(',')
                .append(row.getTaxAmount()).append(',')
                .append(row.getTotalAmount()).append(',')
                .append(row.getSplitCount()).append(',')
                .append(csv(row.getCouponCode())).append(',')
                .append(csv(row.getPaymentMethods())).append(',')
                .append(csv(row.getPaymentReferences()))
                .append('\n');
        }
        return csv.toString();
    }

    private Double calculateFulfilmentPct() {
        long delivered = indentRepository.countByStatus(Status.DELIVERED);
        long cancelled = indentRepository.countByStatus(Status.CANCELLED);
        long total = delivered + cancelled;

        if (total == 0) return 100.0;

        return Math.round((delivered * 100.0 / total) * 10.0) / 10.0;
    }

    @SuppressWarnings("unchecked")
    private Map<UUID, BigDecimal> getAverageDailyDemand(Collection<UUID> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return Map.of();
        }

        String sql = """
            SELECT ii.item_id, COALESCE(SUM(ii.requested_qty), 0) / 30.0 AS avg_daily_demand
            FROM indent_items ii
            JOIN indents i ON i.id = ii.indent_id
            WHERE ii.item_id IN :itemIds
              AND i.status NOT IN ('DRAFT', 'CANCELLED')
              AND i.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY ii.item_id
            """;

        List<Object[]> rows = entityManager.createNativeQuery(sql)
            .setParameter("itemIds", itemIds)
            .getResultList();

        Map<UUID, BigDecimal> result = new HashMap<>();
        for (Object[] row : rows) {
            UUID itemId = row[0] instanceof UUID uuid ? uuid : UUID.fromString(row[0].toString());
            result.put(itemId, new BigDecimal(row[1].toString()).setScale(3, RoundingMode.HALF_UP));
        }
        return result;
    }

    private Map<UUID, SupplierItemMappingEntity> getBestMappingByItem(Collection<UUID> itemIds) {
        if (itemIds == null || itemIds.isEmpty()) {
            return Map.of();
        }

        Map<UUID, SupplierItemMappingEntity> result = new HashMap<>();
        for (SupplierItemMappingEntity mapping : supplierItemMappingRepository.findActiveMappingsForItems(itemIds)) {
            result.compute(mapping.getItem().getId(), (itemId, existing) -> {
                if (existing == null) {
                    return mapping;
                }
                return compareMappings(mapping, existing) < 0 ? mapping : existing;
            });
        }
        return result;
    }

    private int compareMappings(SupplierItemMappingEntity left, SupplierItemMappingEntity right) {
        if (left.isPreferred() != right.isPreferred()) {
            return left.isPreferred() ? -1 : 1;
        }

        int leadCompare = Integer.compare(resolveLeadTime(left), resolveLeadTime(right));
        if (leadCompare != 0) {
            return leadCompare;
        }

        if (left.getLastUnitCost() != null && right.getLastUnitCost() != null) {
            int costCompare = left.getLastUnitCost().compareTo(right.getLastUnitCost());
            if (costCompare != 0) {
                return costCompare;
            }
        } else if (left.getLastUnitCost() != null) {
            return -1;
        } else if (right.getLastUnitCost() != null) {
            return 1;
        }

        return left.getSupplier().getName().compareToIgnoreCase(right.getSupplier().getName());
    }

    private int resolveLeadTime(SupplierItemMappingEntity mapping) {
        return mapping.getLeadTimeDays() != null ? mapping.getLeadTimeDays() : mapping.getSupplier().getLeadTimeDays();
    }

    private BigDecimal resolveSuggestedOrderQty(
        BigDecimal currentStock,
        BigDecimal minLevel,
        BigDecimal reorderLevel,
        BigDecimal maxLevel
    ) {
        BigDecimal target = maxLevel != null
            ? maxLevel
            : minLevel.max(reorderLevel).multiply(BigDecimal.valueOf(2));
        return target.subtract(currentStock).max(BigDecimal.ZERO).setScale(3, RoundingMode.HALF_UP);
    }

    private String resolveRiskLevel(BigDecimal currentStock, BigDecimal minLevel, Double daysCover) {
        if (currentStock.compareTo(minLevel.divide(BigDecimal.valueOf(2), 3, RoundingMode.HALF_UP)) <= 0) {
            return "CRITICAL";
        }
        if (daysCover != null && daysCover <= 3) {
            return "CRITICAL";
        }
        if (currentStock.compareTo(minLevel) <= 0) {
            return "HIGH";
        }
        if (daysCover != null && daysCover <= 7) {
            return "HIGH";
        }
        return "MEDIUM";
    }

    private int riskRank(String riskLevel) {
        return switch (riskLevel) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            default -> 2;
        };
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private long toLong(Object value) {
        return value == null ? 0L : ((Number) value).longValue();
    }

    private double toDouble(Object value) {
        return value == null ? 0d : ((Number) value).doubleValue();
    }

    private Double toNullableDouble(Object value) {
        return value == null ? null : round(((Number) value).doubleValue(), 2);
    }

    private Double round(double value, int scale) {
        BigDecimal rounded = BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
        return rounded.doubleValue();
    }

    private String text(Object value) {
        return value == null ? null : value.toString();
    }

    private String csv(String value) {
        if (value == null) {
            return "";
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private AnalyticsResponse.CashierShiftReport toCashierShiftReport(PosCashierShiftEntity shift, List<PosOrderEntity> paidOrders) {
        LocalDateTime shiftEnd = shift.getClosedAt() != null ? shift.getClosedAt() : LocalDateTime.now();
        List<PosOrderEntity> shiftOrders = paidOrders.stream()
            .filter(order -> order.getUpdatedBy() != null && order.getUpdatedBy().getId().equals(shift.getUser().getId()))
            .filter(order -> order.getPaidAt() != null
                && !order.getPaidAt().isBefore(shift.getOpenedAt())
                && !order.getPaidAt().isAfter(shiftEnd))
            .toList();

        BigDecimal netSales = shiftOrders.stream()
            .map(PosOrderEntity::getTotalAmount)
            .filter(java.util.Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> totals = initPaymentTotals();
        shiftOrders.forEach(order -> addPayments(totals, order.getPayments()));

        return AnalyticsResponse.CashierShiftReport.builder()
            .shiftId(shift.getId().toString())
            .cashierId(shift.getUser().getId().toString())
            .cashierName(shift.getUser().getName())
            .status(shift.getShiftStatus().name())
            .openedAt(formatTimestamp(shift.getOpenedAt()))
            .closedAt(formatTimestamp(shift.getClosedAt()))
            .openingCash(toDouble(shift.getOpeningCash()))
            .expectedCash(toNullableDouble(shift.getExpectedCash()))
            .closingCash(toNullableDouble(shift.getClosingCash()))
            .varianceAmount(toNullableDouble(shift.getVarianceAmount()))
            .totalBills(shiftOrders.size())
            .netSales(netSales.doubleValue())
            .paymentTotals(toDoubleMap(totals))
            .build();
    }

    private AnalyticsResponse.CashierSettlementReport toCashierSettlementReport(PosOrderEntity order) {
        String paymentMethods = order.getPayments().stream()
            .map(payment -> payment.getPaymentMethod().name() + " " + moneyLabel(payment.getAmount()))
            .reduce((left, right) -> left + " | " + right)
            .orElse("");
        String paymentReferences = order.getPayments().stream()
            .map(PosOrderPaymentEntity::getReferenceNumber)
            .filter(reference -> reference != null && !reference.isBlank())
            .reduce((left, right) -> left + " | " + right)
            .orElse("");

        return AnalyticsResponse.CashierSettlementReport.builder()
            .orderId(order.getId().toString())
            .orderNumber(order.getOrderNumber())
            .cashierName(order.getUpdatedBy() != null ? order.getUpdatedBy().getName() : null)
            .tableNumber(order.getTable() != null ? order.getTable().getTableNumber() : "Walk-in")
            .paidAt(formatTimestamp(order.getPaidAt()))
            .subtotal(toDouble(order.getSubtotal()))
            .discountAmount(toDouble(order.getDiscountAmount()))
            .taxAmount(toDouble(order.getTaxAmount()))
            .totalAmount(toDouble(order.getTotalAmount()))
            .couponCode(order.getCouponCode())
            .splitCount(order.getSplitCount() != null ? order.getSplitCount() : 1)
            .paymentMethods(paymentMethods)
            .paymentReferences(paymentReferences)
            .build();
    }

    private UserEntity requireBranchPosUser(UserEntity currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (!(currentUser.isRestaurant() || currentUser.isAdmin() || currentUser.isWarehouseAdmin())) {
            throw new AccessDeniedException("You do not have access to POS reconciliation");
        }
        if (currentUser.getBranch() == null) {
            throw new AccessDeniedException("A branch is required for POS reconciliation");
        }
        return currentUser;
    }

    private UserEntity requireAnalyticsAccess(UserEntity currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required");
        }
        if (!(currentUser.isRestaurant() || currentUser.isWarehouse() || currentUser.isAdmin())) {
            throw new AccessDeniedException("You do not have access to analytics");
        }
        if (currentUser.isRestaurant() && currentUser.getBranch() == null) {
            throw new AccessDeniedException("A branch is required for restaurant analytics");
        }
        return currentUser;
    }

    private UUID resolveAnalyticsBranchScope(UserEntity currentUser) {
        UserEntity user = requireAnalyticsAccess(currentUser);
        return user.isRestaurant() ? user.getBranch().getId() : null;
    }

    private boolean canViewWarehouseAnalytics(UserEntity currentUser) {
        UserEntity user = requireAnalyticsAccess(currentUser);
        return user.isWarehouse() || user.isAdmin();
    }

    private Map<String, BigDecimal> initPaymentTotals() {
        Map<String, BigDecimal> totals = new LinkedHashMap<>();
        for (PosOrderPaymentEntity.PaymentMethod method : PosOrderPaymentEntity.PaymentMethod.values()) {
            totals.put(method.name(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }
        return totals;
    }

    private void addPayments(Map<String, BigDecimal> totals, List<PosOrderPaymentEntity> payments) {
        if (payments == null) {
            return;
        }
        for (PosOrderPaymentEntity payment : payments) {
            totals.compute(payment.getPaymentMethod().name(), (key, value) ->
                safe(value).add(safe(payment.getAmount())).setScale(2, RoundingMode.HALF_UP));
        }
    }

    private Map<String, Double> toDoubleMap(Map<String, BigDecimal> values) {
        Map<String, Double> result = new LinkedHashMap<>();
        values.forEach((key, value) -> result.put(key, value != null ? value.doubleValue() : 0d));
        return result;
    }

    private BigDecimal safe(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String formatTimestamp(LocalDateTime value) {
        return value == null ? null : value.format(TIMESTAMP_FORMAT);
    }

    private String moneyLabel(BigDecimal value) {
        return safe(value).setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private AnalyticsResponse.StockAgingReport toStockAgingReport(WarehouseStockLotEntity lot) {
        LocalDate receivedDate = lot.getReceivedAt() != null ? lot.getReceivedAt().toLocalDate() : null;
        Integer ageDays = receivedDate != null ? (int) java.time.temporal.ChronoUnit.DAYS.between(receivedDate, LocalDate.now()) : null;
        return AnalyticsResponse.StockAgingReport.builder()
            .itemId(lot.getItem().getId().toString())
            .itemCode(lot.getItem().getCode())
            .itemName(lot.getItem().getName())
            .category(lot.getItem().getCategory() != null ? lot.getItem().getCategory().getName() : null)
            .unit(lot.getItem().getUnit())
            .batchNumber(lot.getBatchNumber())
            .supplierName(lot.getSupplier() != null ? lot.getSupplier().getName() : null)
            .receivedDate(receivedDate != null ? receivedDate.toString() : null)
            .expiryDate(lot.getExpiryDate() != null ? lot.getExpiryDate().toString() : null)
            .remainingQuantity(lot.getRemainingQuantity().doubleValue())
            .ageDays(ageDays)
            .ageBucket(resolveAgeBucket(ageDays))
            .stockStatus(lot.getLotStatus())
            .build();
    }

    private String resolveAgeBucket(Integer ageDays) {
        if (ageDays == null) {
            return "UNKNOWN";
        }
        if (ageDays <= 7) {
            return "0-7_DAYS";
        }
        if (ageDays <= 30) {
            return "8-30_DAYS";
        }
        if (ageDays <= 60) {
            return "31-60_DAYS";
        }
        return "60+_DAYS";
    }

    private int ageBucketRank(String ageBucket) {
        return switch (ageBucket) {
            case "60+_DAYS" -> 0;
            case "31-60_DAYS" -> 1;
            case "8-30_DAYS" -> 2;
            case "0-7_DAYS" -> 3;
            default -> 4;
        };
    }
}
