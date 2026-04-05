// ============================================================
// INDENT REQUEST DTOs
// ============================================================
package com.vbworld.api.presentation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public class IndentRequest {

    @Data
    public static class Create {
        private UUID branchId;   // optional — taken from user's branch if not set

        @Future(message = "Expected date must be in the future")
        private LocalDate expectedDate;

        private String requestedDeliverySlot;

        private String notes;

        @NotEmpty(message = "At least one item is required")
        @Valid
        private List<LineItem> items;
    }

    @Data
    public static class LineItem {
        @NotNull(message = "Item ID is required")
        private UUID itemId;

        @NotNull @DecimalMin(value = "0.001", message = "Quantity must be greater than 0")
        private BigDecimal quantity;

        private String notes;
    }

    @Data
    public static class Approve {
        private List<ApproveItem> items; // null = approve all as requested
    }

    @Data
    public static class ApproveItem {
        @NotNull private UUID itemId;
        @NotNull @DecimalMin("0") private BigDecimal approvedQty;
    }

    @Data
    public static class Cancel {
        @NotBlank(message = "Cancel reason is required")
        private String reason;
    }

    @Data
    public static class Deliver {
        private List<DeliverItem> items; // null = mark all approved qty as delivered
    }

    @Data
    public static class DeliverItem {
        @NotNull private UUID itemId;
        @NotNull @DecimalMin("0") private BigDecimal deliveredQty;
    }

    @Data
    public static class Reschedule {
        @NotNull
        private LocalDate scheduledDate;

        @NotBlank
        private String deliverySlot;

        @NotBlank
        private String reason;
    }
}
