package com.vbworld.api.presentation.controller;

import com.vbworld.api.application.service.AnalyticsService;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.presentation.dto.response.AnalyticsResponse;
import com.vbworld.api.presentation.dto.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics", description = "Dashboard analytics and reporting")
@SecurityRequirement(name = "bearerAuth")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/summary")
    @Operation(summary = "Get dashboard KPI summary")
    public ResponseEntity<ApiResponse<AnalyticsResponse.DashboardSummary>> summary(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getDashboardSummary(currentUser)
        ));
    }

    @GetMapping("/daily")
    @Operation(summary = "Get daily order trend")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.DailyPoint>>> daily(
        @RequestParam(defaultValue = "14") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getDailyTrend(Math.min(days, 90), currentUser)
        ));
    }

    @GetMapping("/branches")
    @Operation(summary = "Get branch-wise order summary (last 7 days)")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.BranchSummary>>> branches(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getBranchSummary(currentUser)
        ));
    }

    @GetMapping("/top-items")
    @Operation(summary = "Get top ordered items")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.TopItem>>> topItems(
        @RequestParam(defaultValue = "30") int days,
        @RequestParam(defaultValue = "10") int limit,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getTopItems(days, Math.min(limit, 50), currentUser)
        ));
    }

    @GetMapping("/reports/summary")
    @Operation(summary = "Get advanced reporting summary")
    public ResponseEntity<ApiResponse<AnalyticsResponse.ReportSummary>> reportSummary(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getReportSummary(days, currentUser)
        ));
    }

    @GetMapping("/reports/branches")
    @Operation(summary = "Get branch performance report")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.BranchPerformanceReport>>> branchPerformance(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getBranchPerformanceReport(days, currentUser)
        ));
    }

    @GetMapping("/reports/inventory-risk")
    @Operation(summary = "Get inventory risk report")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.InventoryRiskReport>>> inventoryRisk(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getInventoryRiskReport(currentUser)
        ));
    }

    @GetMapping("/reports/wastage")
    @Operation(summary = "Get wastage and dead-stock report")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.WastageReport>>> wastage(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getWastageReport(days, currentUser)
        ));
    }

    @GetMapping("/reports/executive")
    @Operation(summary = "Get executive summary report")
    public ResponseEntity<ApiResponse<AnalyticsResponse.ExecutiveSummary>> executive(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getExecutiveSummary(days, currentUser)
        ));
    }

    @GetMapping("/reports/sla")
    @Operation(summary = "Get branch SLA report")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.SlaReport>>> sla(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getSlaReport(days, currentUser)
        ));
    }

    @GetMapping("/reports/stock-aging")
    @Operation(summary = "Get stock aging report")
    public ResponseEntity<ApiResponse<List<AnalyticsResponse.StockAgingReport>>> stockAging(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getStockAgingReport(currentUser)
        ));
    }

    @GetMapping("/reports/cashier-reconciliation")
    @Operation(summary = "Get cashier end-of-day reconciliation report")
    public ResponseEntity<ApiResponse<AnalyticsResponse.CashierReconciliationReport>> cashierReconciliation(
        @RequestParam(required = false) LocalDate date,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
            analyticsService.getCashierReconciliationReport(date, currentUser)
        ));
    }

    @GetMapping(value = "/reports/branches/export", produces = "text/csv")
    @Operation(summary = "Export branch performance report as CSV")
    public ResponseEntity<byte[]> exportBranchPerformance(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        byte[] body = analyticsService.exportBranchPerformanceCsv(days, currentUser)
            .getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=branch-performance-report.csv")
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .body(body);
    }

    @GetMapping(value = "/reports/inventory-risk/export", produces = "text/csv")
    @Operation(summary = "Export inventory risk report as CSV")
    public ResponseEntity<byte[]> exportInventoryRisk(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        byte[] body = analyticsService.exportInventoryRiskCsv(currentUser)
            .getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=inventory-risk-report.csv")
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .body(body);
    }

    @GetMapping(value = "/reports/executive/export", produces = "text/csv")
    @Operation(summary = "Export executive summary report as CSV")
    public ResponseEntity<byte[]> exportExecutive(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        byte[] body = analyticsService.exportExecutiveSummaryCsv(days, currentUser)
            .getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=executive-summary-" + days + "d.csv")
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .body(body);
    }

    @GetMapping(value = "/reports/sla/export", produces = "text/csv")
    @Operation(summary = "Export SLA report as CSV")
    public ResponseEntity<byte[]> exportSla(
        @RequestParam(defaultValue = "30") int days,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        byte[] body = analyticsService.exportSlaCsv(days, currentUser)
            .getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=sla-report-" + days + "d.csv")
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .body(body);
    }

    @GetMapping(value = "/reports/stock-aging/export", produces = "text/csv")
    @Operation(summary = "Export stock aging report as CSV")
    public ResponseEntity<byte[]> exportStockAging(
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        byte[] body = analyticsService.exportStockAgingCsv(currentUser)
            .getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=stock-aging-report.csv")
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .body(body);
    }

    @GetMapping(value = "/reports/cashier-reconciliation/export", produces = "text/csv")
    @Operation(summary = "Export cashier reconciliation report as CSV")
    public ResponseEntity<byte[]> exportCashierReconciliation(
        @RequestParam(required = false) LocalDate date,
        @AuthenticationPrincipal UserEntity currentUser
    ) {
        LocalDate businessDate = date != null ? date : LocalDate.now();
        byte[] body = analyticsService.exportCashierReconciliationCsv(businessDate, currentUser)
            .getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=cashier-reconciliation-" + businessDate + ".csv")
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .body(body);
    }
}
