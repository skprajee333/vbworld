package com.vbworld.api.application.service;

import com.vbworld.api.infrastructure.entity.BranchEntity;
import com.vbworld.api.infrastructure.entity.IndentEntity;
import com.vbworld.api.infrastructure.entity.IndentItemEntity;
import com.vbworld.api.infrastructure.entity.ItemEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.repository.BranchRepository;
import com.vbworld.api.infrastructure.repository.IndentRepository;
import com.vbworld.api.infrastructure.repository.ItemRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmartSuggestionService {

    private final IndentRepository indentRepository;
    private final BranchRepository branchRepository;
    private final ItemRepository itemRepository;
    private final GovernanceService governanceService;

    @PersistenceContext
    private EntityManager em;

    private static final int MIN_DAYS_FOR_SUGGESTIONS = 7;

    private static final Map<Integer, Double> DAY_WEIGHTS = Map.of(
        1, 0.9,
        2, 1.0,
        3, 1.0,
        4, 1.1,
        5, 1.4,
        6, 2.0,
        7, 1.8
    );

    @Transactional(readOnly = true)
    public ReadinessStatus getReadinessStatus(UUID branchId) {
        String sql = """
            SELECT
                COUNT(DISTINCT DATE(created_at)) AS distinct_days,
                MIN(created_at)                  AS first_order_date,
                COUNT(*)                         AS total_orders
            FROM indents
            WHERE branch_id = :branchId
              AND status NOT IN ('DRAFT', 'CANCELLED')
            """;

        Object[] row = (Object[]) em.createNativeQuery(sql)
            .setParameter("branchId", branchId)
            .getSingleResult();

        long distinctDays = ((Number) row[0]).longValue();
        long totalOrders = ((Number) row[2]).longValue();
        boolean ready = distinctDays >= MIN_DAYS_FOR_SUGGESTIONS;
        int daysRemaining = (int) Math.max(0, MIN_DAYS_FOR_SUGGESTIONS - distinctDays);

        String confidence;
        int confidencePct;
        if (distinctDays < 7) {
            confidence = "NOT_READY";
            confidencePct = 0;
        } else if (distinctDays < 14) {
            confidence = "LOW";
            confidencePct = 30;
        } else if (distinctDays < 28) {
            confidence = "MEDIUM";
            confidencePct = 65;
        } else if (distinctDays < 60) {
            confidence = "HIGH";
            confidencePct = 85;
        } else {
            confidence = "VERY_HIGH";
            confidencePct = 95;
        }

        return new ReadinessStatus(ready, (int) distinctDays, daysRemaining, totalOrders, confidence, confidencePct);
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public SmartSuggestionResult getSuggestions(UUID branchId, LocalDate targetDate) {

        ReadinessStatus readiness = getReadinessStatus(branchId);
        if (!readiness.ready()) {
            return SmartSuggestionResult.notReady(readiness);
        }

        int dow = targetDate.getDayOfWeek().getValue();
        double dayWeight = DAY_WEIGHTS.getOrDefault(dow, 1.0);
        String dayName = targetDate.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);

        String sql = """
            SELECT
                CAST(it.id AS text) AS item_id,
                it.name           AS item_name,
                it.code           AS item_code,
                COALESCE(c.name, '') AS category,
                ii.unit,
                COUNT(*)          AS data_points,

                COALESCE(
                    SUM(ii.requested_qty * w.weight) / NULLIF(SUM(w.weight), 0),
                    0
                ) AS weighted_avg_qty,

                COALESCE(
                    SUM(ii.requested_qty) / NULLIF(COUNT(*), 0),
                    0
                ) AS simple_avg_qty,

                COALESCE(MAX(ii.requested_qty), 0) AS max_qty,
                COALESCE(MIN(ii.requested_qty), 0) AS min_qty

            FROM indent_items ii
            JOIN indents i  ON i.id = ii.indent_id
            JOIN items it   ON it.id = ii.item_id
            LEFT JOIN categories c ON c.id = it.category_id

            CROSS JOIN LATERAL (
                SELECT CASE
                    WHEN i.created_at >= CURRENT_DATE - INTERVAL '14 days' THEN 3.0
                    WHEN i.created_at >= CURRENT_DATE - INTERVAL '28 days' THEN 2.0
                    WHEN i.created_at >= CURRENT_DATE - INTERVAL '56 days' THEN 1.0
                    ELSE 0.5
                END AS weight
            ) w

            WHERE i.branch_id = :branchId
              AND i.status NOT IN ('DRAFT', 'CANCELLED')
              AND EXTRACT(ISODOW FROM i.created_at) = :dow
              AND i.created_at >= CURRENT_DATE - INTERVAL '90 days'

            GROUP BY it.id, it.name, it.code, c.name, ii.unit
            HAVING COUNT(*) >= 1
            ORDER BY weighted_avg_qty DESC
            LIMIT 30
            """;

        List<Object[]> rows = em.createNativeQuery(sql)
            .setParameter("branchId", branchId)
            .setParameter("dow", dow)
            .getResultList();

        log.info("SmartSuggestion → branch={}, dow={}, rows={}", branchId, dow, rows.size());

        List<SuggestionItem> items = new ArrayList<>();

        for (Object[] col : rows) {

            try {
                String itemId = col[0] != null ? col[0].toString() : "";
                String itemName = col[1] != null ? col[1].toString() : "";
                String itemCode = col[2] != null ? col[2].toString() : "";
                String category = col[3] != null ? col[3].toString() : "";
                String unit = col[4] != null ? col[4].toString() : "";

                int dataPoints = col[5] != null ? ((Number) col[5]).intValue() : 0;

                double weightedAvg = col[6] != null ? ((Number) col[6]).doubleValue() : 0;
                double simpleAvg = col[7] != null ? ((Number) col[7]).doubleValue() : 0;
                double maxQty = col[8] != null ? ((Number) col[8]).doubleValue() : 0;

                double suggestedQty = Math.ceil(weightedAvg * dayWeight * 2) / 2;

                int itemConfPct = Math.min(100, dataPoints * 25);
                String itemConf = itemConfPct >= 75 ? "HIGH"
                    : itemConfPct >= 50 ? "MEDIUM"
                    : "LOW";

                double trendPct = simpleAvg > 0
                    ? Math.round(((weightedAvg - simpleAvg) / simpleAvg) * 100.0)
                    : 0;

                items.add(new SuggestionItem(
                    itemId,
                    itemName,
                    itemCode,
                    category,
                    unit,
                    suggestedQty,
                    dataPoints,
                    itemConf,
                    itemConfPct,
                    trendPct,
                    weightedAvg,
                    maxQty
                ));

            } catch (Exception e) {
                log.error("Error mapping suggestion row: {}", e.getMessage(), e);
            }
        }

        return new SmartSuggestionResult(
            true,
            readiness,
            targetDate,
            dayName,
            dow,
            dayWeight,
            items
        );
    }
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<DayPattern> getDayPatterns(UUID branchId) {
        String sql = """
            SELECT
                CAST(EXTRACT(ISODOW FROM i.created_at) AS int) AS dow,
                COUNT(*)                                 AS order_count,
                COALESCE(SUM(ii.requested_qty), 0)       AS total_qty,
                COUNT(DISTINCT DATE(i.created_at))       AS distinct_days
            FROM indents i
            LEFT JOIN indent_items ii ON ii.indent_id = i.id
            WHERE i.branch_id = :branchId
              AND i.status NOT IN ('DRAFT','CANCELLED')
              AND i.created_at >= CURRENT_DATE - INTERVAL '90 days'
            GROUP BY CAST(EXTRACT(ISODOW FROM i.created_at) AS int)
            ORDER BY dow
            """;

        List<Object[]> rows = em.createNativeQuery(sql)
            .setParameter("branchId", branchId)
            .getResultList();

        String[] dayNames = {"", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"};
        List<DayPattern> patterns = new ArrayList<>();
        Map<Integer, Object[]> dataMap = new LinkedHashMap<>();
        for (Object[] col : rows) {
            dataMap.put(((Number) col[0]).intValue(), col);
        }

        for (int day = 1; day <= 7; day++) {
            if (dataMap.containsKey(day)) {
                Object[] col = dataMap.get(day);
                patterns.add(new DayPattern(
                    day,
                    dayNames[day],
                    ((Number) col[1]).longValue(),
                    ((Number) col[2]).doubleValue(),
                    ((Number) col[3]).longValue(),
                    DAY_WEIGHTS.getOrDefault(day, 1.0)));
            } else {
                patterns.add(new DayPattern(day, dayNames[day], 0, 0, 0, DAY_WEIGHTS.getOrDefault(day, 1.0)));
            }
        }
        return patterns;
    }

    @Transactional(readOnly = true)
    public BranchForecastResult getBranchForecast(UUID branchId, LocalDate startDate, Integer days) {
        BranchEntity branch = branchRepository.findById(branchId)
            .orElseThrow(() -> new IllegalArgumentException("Branch not found: " + branchId));
        return buildBranchForecast(branch, startDate != null ? startDate : minimumForecastDate(branch), days);
    }

    @Transactional(readOnly = true)
    public List<BranchForecastResult> getNetworkForecast(LocalDate startDate, Integer days, UserEntity currentUser) {
        ensureWarehouseRole(currentUser);
        LocalDate effectiveStart = startDate != null ? startDate : LocalDate.now().plusDays(1);
        return branchRepository.findAllByActiveTrue().stream()
            .map(branch -> buildBranchForecast(branch, effectiveStart, days))
            .sorted(Comparator
                .comparingInt((BranchForecastResult result) -> result.ready() ? 0 : 1)
                .thenComparing(BranchForecastResult::autoReplenishEnabled, Comparator.reverseOrder())
                .thenComparing(BranchForecastResult::totalRecommendedQuantity, Comparator.reverseOrder())
                .thenComparing(BranchForecastResult::branchName, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    @Transactional
    public AutoReplenishmentDraftResult createForecastDraft(
        UUID branchId,
        LocalDate requestedDate,
        Integer days,
        UserEntity currentUser
    ) {
        BranchEntity branch = branchRepository.findById(branchId)
            .orElseThrow(() -> new IllegalArgumentException("Branch not found: " + branchId));

        if (!(currentUser.isAdmin() || currentUser.isWarehouse() || currentUser.isWarehouseAdmin()
            || (currentUser.getBranch() != null && currentUser.getBranch().getId().equals(branchId)))) {
            throw new AccessDeniedException("You do not have permission to create forecast drafts for this branch");
        }

        LocalDate startDate = requestedDate != null ? requestedDate : minimumForecastDate(branch);
        BranchForecastResult forecast = buildBranchForecast(branch, startDate, days);
        if (!forecast.ready()) {
            throw new IllegalArgumentException("Branch does not have enough data for auto-replenishment yet");
        }
        if (forecast.items().isEmpty()) {
            throw new IllegalArgumentException("No forecast items available for draft generation");
        }

        LocalDate scheduledDate = startDate.isBefore(minimumForecastDate(branch)) ? minimumForecastDate(branch) : startDate;
        IndentEntity.DeliverySlot slot = defaultSlot(branch);
        IndentEntity indent = IndentEntity.builder()
            .branch(branch)
            .createdBy(currentUser)
            .status(IndentEntity.Status.DRAFT)
            .expectedDate(scheduledDate)
            .scheduledDeliveryDate(scheduledDate)
            .requestedDeliverySlot(slot)
            .promisedDeliverySlot(slot)
            .cutoffApplied(scheduledDate.isAfter(LocalDate.now().plusDays(branch.getOrderLeadDays() != null ? branch.getOrderLeadDays() : 1)))
            .notes("Auto-replenishment draft from forecast (" + forecast.forecastDays() + " day horizon, " + forecast.items().size() + " items)")
            .build();

        for (ForecastItem item : forecast.items()) {
            ItemEntity mappedItem = itemRepository.findById(item.itemId())
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + item.itemId()));
            indent.addItem(IndentItemEntity.builder()
                .item(mappedItem)
                .requestedQty(item.recommendedQuantity())
                .unit(item.unit())
                .notes("Forecast avg " + item.averageConfidencePct() + "% confidence, buffer " + item.bufferQuantity())
                .build());
        }

        IndentEntity saved = indentRepository.save(indent);
        governanceService.logAction(
            currentUser,
            "SMART_REPLENISHMENT",
            "FORECAST_DRAFT_CREATED",
            "INDENT",
            saved.getId(),
            "Created auto-replenishment draft " + saved.getIndentNumber(),
            "Branch: " + branch.getName() + ", forecast start: " + forecast.startDate());
        governanceService.notifyUsers(
            governanceService.getApprovedUsersByRoles(List.of(
                UserEntity.Role.ADMIN,
                UserEntity.Role.WAREHOUSE_ADMIN,
                UserEntity.Role.WAREHOUSE_MANAGER)),
            "INDENT",
            "Forecast replenishment draft created",
            branch.getName() + " now has a forecast-driven draft indent ready for review",
            "/orders",
            "INDENT",
            saved.getId());

        return new AutoReplenishmentDraftResult(
            saved.getId(),
            saved.getIndentNumber(),
            branch.getId(),
            branch.getName(),
            saved.getScheduledDeliveryDate(),
            saved.getPromisedDeliverySlot() != null ? saved.getPromisedDeliverySlot().name() : null,
            saved.getItems().size(),
            forecast.totalRecommendedQuantity());
    }

    private BranchForecastResult buildBranchForecast(BranchEntity branch, LocalDate startDate, Integer requestedDays) {
        int forecastDays = requestedDays != null && requestedDays > 0 ? requestedDays : safeInt(branch.getForecastHorizonDays(), 3);
        int safetyDays = Math.max(0, safeInt(branch.getSafetyStockDays(), 1));
        int minConfidence = Math.max(0, Math.min(100, safeInt(branch.getAutoReplenishMinConfidencePct(), 55)));

        ReadinessStatus readiness = getReadinessStatus(branch.getId());
        if (!readiness.ready()) {
            return new BranchForecastResult(
                branch.getId(),
                branch.getName(),
                false,
                readiness,
                branch.isAutoReplenishEnabled(),
                startDate,
                forecastDays,
                safetyDays,
                minConfidence,
                branch.getDefaultDeliverySlot() != null ? branch.getDefaultDeliverySlot().name() : "MORNING",
                BigDecimal.ZERO,
                0,
                List.of(),
                List.of());
        }

        Map<UUID, ForecastAccumulator> items = new LinkedHashMap<>();
        List<ForecastDay> days = new ArrayList<>();
        for (int index = 0; index < forecastDays; index++) {
            LocalDate date = startDate.plusDays(index);
            SmartSuggestionResult result = getSuggestions(branch.getId(), date);
            BigDecimal dailyQuantity = BigDecimal.ZERO;
            for (SuggestionItem item : result.items()) {
                dailyQuantity = dailyQuantity.add(BigDecimal.valueOf(item.suggestedQty()));
                UUID uuid = item.itemIdAsUuid();

                if (uuid != null) {
                    items.computeIfAbsent(uuid, ignored -> new ForecastAccumulator(item))
                         .add(item, date);
                } else {
                    log.warn("Skipping item with invalid UUID: {}", item.itemId());
                }
            }
            days.add(new ForecastDay(
                date,
                date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                result.items().size(),
                dailyQuantity.setScale(2, RoundingMode.HALF_UP)));
        }

        List<ForecastItem> forecastItems = items.values().stream()
            .map(acc -> acc.toForecastItem(safetyDays))
            .filter(item -> item.averageConfidencePct() >= minConfidence)
            .sorted(Comparator.comparing(ForecastItem::recommendedQuantity, Comparator.reverseOrder())
                .thenComparing(ForecastItem::itemName, String.CASE_INSENSITIVE_ORDER))
            .limit(18)
            .toList();

        BigDecimal total = forecastItems.stream()
            .map(ForecastItem::recommendedQuantity)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);

        return new BranchForecastResult(
            branch.getId(),
            branch.getName(),
            true,
            readiness,
            branch.isAutoReplenishEnabled(),
            startDate,
            forecastDays,
            safetyDays,
            minConfidence,
            branch.getDefaultDeliverySlot() != null ? branch.getDefaultDeliverySlot().name() : "MORNING",
            total,
            forecastItems.size(),
            forecastItems,
            days);
    }

    private LocalDate minimumForecastDate(BranchEntity branch) {
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

    private void ensureWarehouseRole(UserEntity currentUser) {
        if (!(currentUser.isAdmin() || currentUser.isWarehouse() || currentUser.isWarehouseAdmin())) {
            throw new AccessDeniedException("You do not have permission to view network forecasting");
        }
    }

    private int safeInt(Integer value, int fallback) {
        return value != null ? value : fallback;
    }

    public record ReadinessStatus(
        boolean ready,
        int distinctDays,
        int daysRemaining,
        long totalOrders,
        String confidence,
        int confidencePct
    ) {}

    public record SuggestionItem(
        String itemId,
        String itemName,
        String itemCode,
        String category,
        String unit,
        double suggestedQty,
        int dataPoints,
        String confidence,
        int confidencePct,
        double trendPct,
        double historicalAvg,
        double maxQty
    ) {
    	public UUID itemIdAsUuid() {
    	    try {
    	        return itemId != null && !itemId.isBlank()
    	            ? UUID.fromString(itemId)
    	            : null;
    	    } catch (Exception e) {
    	        return null;
    	    }
    	}
    }

    public record SmartSuggestionResult(
        boolean ready,
        ReadinessStatus readiness,
        LocalDate targetDate,
        String dayName,
        int dayOfWeek,
        double dayWeight,
        List<SuggestionItem> items
    ) {
        public static SmartSuggestionResult notReady(ReadinessStatus readiness) {
            return new SmartSuggestionResult(false, readiness, null, null, 0, 0, List.of());
        }
    }

    public record DayPattern(
        int dayOfWeek,
        String dayName,
        long orderCount,
        double totalQty,
        long distinctDays,
        double weight
    ) {}

    public record ForecastItem(
        UUID itemId,
        String itemName,
        String itemCode,
        String category,
        String unit,
        BigDecimal forecastQuantity,
        BigDecimal bufferQuantity,
        BigDecimal recommendedQuantity,
        int supportingDays,
        int averageConfidencePct,
        String peakDay,
        BigDecimal peakDayQuantity,
        BigDecimal projectedDailyAverage
    ) {}

    public record ForecastDay(
        LocalDate date,
        String dayName,
        int itemCount,
        BigDecimal totalSuggestedQuantity
    ) {}

    public record BranchForecastResult(
        UUID branchId,
        String branchName,
        boolean ready,
        ReadinessStatus readiness,
        boolean autoReplenishEnabled,
        LocalDate startDate,
        int forecastDays,
        int safetyStockDays,
        int minConfidencePct,
        String recommendedSlot,
        BigDecimal totalRecommendedQuantity,
        int itemCount,
        List<ForecastItem> items,
        List<ForecastDay> dailyBreakdown
    ) {}

    public record AutoReplenishmentDraftResult(
        UUID indentId,
        String indentNumber,
        UUID branchId,
        String branchName,
        LocalDate scheduledDate,
        String deliverySlot,
        int itemCount,
        BigDecimal totalRecommendedQuantity
    ) {}

    private static class ForecastAccumulator {
        private final UUID itemId;
        private final String itemName;
        private final String itemCode;
        private final String category;
        private final String unit;
        private BigDecimal forecastQuantity = BigDecimal.ZERO;
        private int supportingDays;
        private int totalConfidence;
        private BigDecimal peakQuantity = BigDecimal.ZERO;
        private String peakDay;

        private ForecastAccumulator(SuggestionItem seed) {
            this.itemId = seed.itemIdAsUuid();
            this.itemName = seed.itemName();
            this.itemCode = seed.itemCode();
            this.category = seed.category();
            this.unit = seed.unit();
        }

        private void add(SuggestionItem item, LocalDate date) {
            BigDecimal suggested = BigDecimal.valueOf(item.suggestedQty()).setScale(2, RoundingMode.HALF_UP);
            forecastQuantity = forecastQuantity.add(suggested);
            supportingDays++;
            totalConfidence += item.confidencePct();
            if (suggested.compareTo(peakQuantity) > 0) {
                peakQuantity = suggested;
                peakDay = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            }
        }

        private ForecastItem toForecastItem(int safetyDays) {
            BigDecimal dailyAverage = supportingDays == 0
                ? BigDecimal.ZERO
                : forecastQuantity.divide(BigDecimal.valueOf(supportingDays), 2, RoundingMode.HALF_UP);
            BigDecimal buffer = dailyAverage.multiply(BigDecimal.valueOf(Math.max(0, safetyDays))).setScale(2, RoundingMode.HALF_UP);
            BigDecimal recommended = forecastQuantity.add(buffer).setScale(2, RoundingMode.HALF_UP);
            int averageConfidence = supportingDays == 0 ? 0 : Math.round((float) totalConfidence / supportingDays);
            return new ForecastItem(
                itemId,
                itemName,
                itemCode,
                category,
                unit,
                forecastQuantity.setScale(2, RoundingMode.HALF_UP),
                buffer,
                recommended,
                supportingDays,
                averageConfidence,
                peakDay,
                peakQuantity.setScale(2, RoundingMode.HALF_UP),
                dailyAverage);
        }
    }
}
