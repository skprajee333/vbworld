package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.PurchaseOrderEntity;
import com.vbworld.api.infrastructure.entity.PurchaseOrderItemEntity;
import com.vbworld.api.infrastructure.entity.SupplierEntity;
import com.vbworld.api.infrastructure.entity.UserEntity;
import com.vbworld.api.infrastructure.entity.WarehouseReceiptEntity;
import com.vbworld.api.infrastructure.entity.WarehouseStockAdjustmentEntity;
import com.vbworld.api.infrastructure.entity.WarehouseStockLotEntity;
import com.vbworld.api.infrastructure.entity.WarehouseStockEntity;
import com.vbworld.api.infrastructure.repository.PurchaseOrderRepository;
import com.vbworld.api.infrastructure.repository.SupplierRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockAdjustmentRepository;
import com.vbworld.api.infrastructure.repository.WarehouseReceiptRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockLotRepository;
import com.vbworld.api.infrastructure.repository.WarehouseStockRepository;
import com.vbworld.api.presentation.dto.response.WarehouseAdjustmentResponse;
import com.vbworld.api.presentation.dto.response.WarehouseReceiptResponse;
import com.vbworld.api.presentation.dto.response.WarehouseStockImportResponse;
import com.vbworld.api.presentation.dto.response.WarehouseStockLotResponse;
import com.vbworld.api.presentation.dto.response.WarehouseStockResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class WarehouseService {

    private final WarehouseStockAdjustmentRepository warehouseStockAdjustmentRepository;
    private final WarehouseReceiptRepository warehouseReceiptRepository;
    private final WarehouseStockLotRepository warehouseStockLotRepository;
    private final WarehouseStockRepository warehouseStockRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final GovernanceService governanceService;
    private final DataFormatter dataFormatter = new DataFormatter(Locale.ENGLISH);

    @Transactional(readOnly = true)
    public List<WarehouseStockResponse> getAllStock(String search) {
        String normalizedSearch = search != null && search.isBlank() ? null : search;
        return (normalizedSearch == null
            ? warehouseStockRepository.findAllWithItems()
            : warehouseStockRepository.findAllWithItemsBySearch(normalizedSearch))
            .stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<WarehouseStockResponse> getLowStockItems() {
        return warehouseStockRepository.findLowStockItems()
            .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<WarehouseReceiptResponse> getRecentReceipts(String search) {
        return warehouseReceiptRepository
            .findRecentReceipts(normalizeSearch(search))
            .stream()
            .map(this::toReceiptResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<WarehouseAdjustmentResponse> getRecentAdjustments(String search) {
        return warehouseStockAdjustmentRepository
            .findRecentAdjustments(normalizeSearch(search))
            .stream()
            .map(this::toAdjustmentResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<WarehouseAdjustmentResponse> getWastageLog() {
        return warehouseStockAdjustmentRepository.findWastageAndDeadStock()
            .stream()
            .map(this::toAdjustmentResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<WarehouseStockLotResponse> getStockLots(String search, Integer expiringWithinDays) {
        List<WarehouseStockLotEntity> lots = expiringWithinDays != null
            ? warehouseStockLotRepository.findExpiringBefore(LocalDate.now().plusDays(Math.max(1, expiringWithinDays)))
            : warehouseStockLotRepository.findAllDetailed(normalizeSearch(search));

        return lots.stream()
            .map(this::toLotResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public byte[] exportCurrentStockWorkbook() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Current Stock");
            Row header = sheet.createRow(0);
            String[] headers = {
                "Item Code", "Item Name", "Category", "Unit", "Quantity",
                "Min Level", "Max Level", "Status", "Updated At", "Updated By"
            };
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }

            List<WarehouseStockEntity> stocks = warehouseStockRepository.findAllWithItems();
            int rowIndex = 1;
            for (WarehouseStockEntity stock : stocks) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(stock.getItem().getCode());
                row.createCell(1).setCellValue(stock.getItem().getName());
                row.createCell(2).setCellValue(stock.getItem().getCategory() != null ? stock.getItem().getCategory().getName() : "");
                row.createCell(3).setCellValue(stock.getItem().getUnit());
                row.createCell(4).setCellValue(toDouble(stock.getQuantity()));
                row.createCell(5).setCellValue(toDouble(stock.getMinLevel()));
                row.createCell(6).setCellValue(stock.getMaxLevel() != null ? toDouble(stock.getMaxLevel()) : 0d);
                row.createCell(7).setCellValue(stock.getStockStatus().name());
                row.createCell(8).setCellValue(stock.getLastUpdatedAt() != null ? stock.getLastUpdatedAt().toString() : "");
                row.createCell(9).setCellValue(stock.getUpdatedBy() != null ? stock.getUpdatedBy().getName() : "");
            }

            autosize(sheet, headers.length);
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to export stock workbook", exception);
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportStockImportTemplateWorkbook() {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Stock Import Template");
            Row header = sheet.createRow(0);
            String[] headers = {
                "Item Code", "Quantity", "Min Level", "Max Level", "Notes"
            };
            for (int i = 0; i < headers.length; i++) {
                header.createCell(i).setCellValue(headers[i]);
            }

            Row sample = sheet.createRow(1);
            sample.createCell(0).setCellValue("ITEM001");
            sample.createCell(1).setCellValue(120);
            sample.createCell(2).setCellValue(25);
            sample.createCell(3).setCellValue(180);
            sample.createCell(4).setCellValue("Opening stock import");

            autosize(sheet, headers.length);
            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to export stock import template", exception);
        }
    }

    @Transactional
    public WarehouseStockImportResponse importCurrentStockWorkbook(MultipartFile file, UserEntity currentUser) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please upload an Excel file");
        }

        List<String> errors = new ArrayList<>();
        int processedRows = 0;
        int updatedRows = 0;

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
            if (sheet == null) {
                throw new IllegalArgumentException("The uploaded workbook is empty");
            }

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new IllegalArgumentException("The uploaded workbook does not contain a header row");
            }

            Map<String, Integer> headerIndex = mapHeaders(headerRow);
            if (!headerIndex.containsKey("item code")) {
                throw new IllegalArgumentException("The uploaded workbook must include an 'Item Code' column");
            }

            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || isBlankRow(row)) {
                    continue;
                }

                processedRows++;
                String itemCode = readString(row, headerIndex.get("item code"));
                if (isBlank(itemCode)) {
                    errors.add("Row " + (rowIndex + 1) + ": Item Code is required");
                    continue;
                }

                WarehouseStockEntity stock = warehouseStockRepository.findDetailedByItemCode(itemCode.trim())
                    .orElse(null);
                if (stock == null) {
                    errors.add("Row " + (rowIndex + 1) + ": Unknown item code " + itemCode);
                    continue;
                }

                try {
                    BigDecimal quantity = readDecimal(row, headerIndex.get("quantity"));
                    BigDecimal minLevel = readDecimal(row, headerIndex.get("min level"));
                    BigDecimal maxLevel = readDecimal(row, headerIndex.get("max level"));
                    String notes = readString(row, headerIndex.get("notes"));

                    if (quantity == null && minLevel == null && maxLevel == null) {
                        errors.add("Row " + (rowIndex + 1) + ": At least one of Quantity, Min Level, or Max Level is required");
                        continue;
                    }
                    if (quantity != null && quantity.compareTo(BigDecimal.ZERO) < 0) {
                        errors.add("Row " + (rowIndex + 1) + ": Quantity cannot be negative");
                        continue;
                    }
                    if (minLevel != null && minLevel.compareTo(BigDecimal.ZERO) < 0) {
                        errors.add("Row " + (rowIndex + 1) + ": Min Level cannot be negative");
                        continue;
                    }
                    if (maxLevel != null && maxLevel.compareTo(BigDecimal.ZERO) < 0) {
                        errors.add("Row " + (rowIndex + 1) + ": Max Level cannot be negative");
                        continue;
                    }

                    if (quantity != null) {
                        stock.setQuantity(quantity);
                    }
                    if (minLevel != null) {
                        stock.setMinLevel(minLevel);
                    }
                    if (maxLevel != null) {
                        stock.setMaxLevel(maxLevel);
                    }
                    stock.setLastUpdatedAt(LocalDateTime.now());
                    stock.setUpdatedBy(currentUser);
                    warehouseStockRepository.save(stock);
                    updatedRows++;

                    governanceService.logAction(
                        currentUser,
                        "WAREHOUSE",
                        "STOCK_IMPORT_ROW",
                        "WAREHOUSE_STOCK",
                        stock.getId(),
                        "Imported stock for " + stock.getItem().getName(),
                        "itemCode=" + stock.getItem().getCode()
                            + ", quantity=" + stock.getQuantity()
                            + ", minLevel=" + stock.getMinLevel()
                            + ", maxLevel=" + stock.getMaxLevel()
                            + (isBlank(notes) ? "" : ", notes=" + notes.trim())
                    );
                } catch (IllegalArgumentException exception) {
                    errors.add("Row " + (rowIndex + 1) + ": " + exception.getMessage());
                }
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read the uploaded workbook", exception);
        }

        return WarehouseStockImportResponse.builder()
            .processedRows(processedRows)
            .updatedRows(updatedRows)
            .skippedRows(Math.max(0, processedRows - updatedRows))
            .errors(errors)
            .build();
    }

    @Transactional
    public WarehouseStockResponse updateStock(
        UUID itemId, BigDecimal quantity,
        BigDecimal minLevel, BigDecimal maxLevel,
        String notes, UserEntity updatedBy
    ) {
        WarehouseStockEntity stock = warehouseStockRepository
            .findByItem_Id(itemId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "No warehouse stock for item: " + itemId));

        if (quantity != null) stock.setQuantity(quantity);
        if (minLevel != null) stock.setMinLevel(minLevel);
        if (maxLevel != null) stock.setMaxLevel(maxLevel);
        stock.setLastUpdatedAt(LocalDateTime.now());
        stock.setUpdatedBy(updatedBy);

        WarehouseStockEntity saved = warehouseStockRepository.save(stock);
        log.info("Warehouse stock updated for item: {} → {}",
            saved.getItem().getName(), saved.getQuantity());

        return toResponse(saved);
    }

    @Transactional
    public WarehouseReceiptResponse receiveStock(
        UUID itemId,
        BigDecimal quantityReceived,
        String receivedUom,
        BigDecimal unitsPerPack,
        BigDecimal unitCost,
        UUID supplierId,
        UUID purchaseOrderId,
        UUID purchaseOrderItemId,
        String supplierName,
        String referenceNumber,
        String invoiceNumber,
        String batchNumber,
        LocalDate expiryDate,
        BigDecimal orderedQuantity,
        BigDecimal shortageQuantity,
        BigDecimal damagedQuantity,
        String notes,
        UserEntity receivedBy
    ) {
        if (quantityReceived == null || quantityReceived.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Received quantity must be greater than zero");
        }
        BigDecimal safeShortage = shortageQuantity != null ? shortageQuantity : BigDecimal.ZERO;
        BigDecimal safeDamaged = damagedQuantity != null ? damagedQuantity : BigDecimal.ZERO;
        BigDecimal safeUnitsPerPack = unitsPerPack != null && unitsPerPack.compareTo(BigDecimal.ZERO) > 0
            ? unitsPerPack
            : BigDecimal.ONE;
        if (safeShortage.compareTo(BigDecimal.ZERO) < 0 || safeDamaged.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Shortage and damaged quantity cannot be negative");
        }
        if (orderedQuantity != null
            && orderedQuantity.compareTo(quantityReceived.add(safeShortage).add(safeDamaged)) < 0) {
            throw new IllegalArgumentException("Ordered quantity must cover received, shortage, and damaged quantities");
        }

        WarehouseStockEntity stock = warehouseStockRepository
            .findByItem_Id(itemId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "No warehouse stock for item: " + itemId));
        SupplierEntity supplier = supplierId != null
            ? supplierRepository.findById(supplierId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found: " + supplierId))
            : null;
        PurchaseOrderEntity purchaseOrder = null;
        PurchaseOrderItemEntity purchaseOrderItem = null;

        if (purchaseOrderId != null || purchaseOrderItemId != null) {
            if (purchaseOrderId == null || purchaseOrderItemId == null) {
                throw new IllegalArgumentException("Purchase order and purchase order line must both be provided");
            }

            purchaseOrder = purchaseOrderRepository.findDetailedById(purchaseOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found: " + purchaseOrderId));
            purchaseOrderItem = purchaseOrder.getItems().stream()
                .filter(line -> line.getId().equals(purchaseOrderItemId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order line not found: " + purchaseOrderItemId));

            if (purchaseOrder.getPoStatus() == PurchaseOrderEntity.PurchaseOrderStatus.CANCELLED) {
                throw new IllegalArgumentException("Cancelled purchase orders cannot receive stock");
            }
            if (!purchaseOrderItem.getItem().getId().equals(itemId)) {
                throw new IllegalArgumentException("GRN item must match the selected purchase order line");
            }
            if (supplier != null && !purchaseOrder.getSupplier().getId().equals(supplier.getId())) {
                throw new IllegalArgumentException("Selected supplier must match the purchase order supplier");
            }

            supplier = purchaseOrder.getSupplier();

            BigDecimal lineOrdered = valueOrZero(purchaseOrderItem.getOrderedQuantity());
            BigDecimal lineReceived = valueOrZero(purchaseOrderItem.getReceivedQuantity());
            BigDecimal remaining = lineOrdered.subtract(lineReceived);
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("This purchase order line has already been fully received");
            }
            if (quantityReceived.compareTo(remaining) > 0) {
                throw new IllegalArgumentException("Received quantity cannot exceed the remaining purchase order quantity");
            }
            if (orderedQuantity == null) {
                orderedQuantity = remaining;
            }

            purchaseOrderItem.setReceivedQuantity(lineReceived.add(quantityReceived));
            if (unitCost != null) {
                purchaseOrderItem.setUnitCost(unitCost);
            }
            purchaseOrder.setUpdatedBy(receivedBy);
            purchaseOrder.setPoStatus(resolvePurchaseOrderStatus(purchaseOrder));
                purchaseOrderRepository.save(purchaseOrder);
        }

        BigDecimal baseQuantityReceived = quantityReceived.multiply(safeUnitsPerPack);
        BigDecimal quantityBefore = stock.getQuantity();
        BigDecimal quantityAfter = quantityBefore.add(baseQuantityReceived);

        stock.setQuantity(quantityAfter);
        stock.setLastUpdatedAt(LocalDateTime.now());
        stock.setUpdatedBy(receivedBy);
        warehouseStockRepository.save(stock);

        WarehouseReceiptEntity.ReceiptStatus receiptStatus =
            safeShortage.compareTo(BigDecimal.ZERO) > 0
                || safeDamaged.compareTo(BigDecimal.ZERO) > 0
                || (orderedQuantity != null && orderedQuantity.compareTo(quantityReceived) > 0)
                ? WarehouseReceiptEntity.ReceiptStatus.RECEIVED_WITH_DISCREPANCY
                : WarehouseReceiptEntity.ReceiptStatus.RECEIVED_OK;

        WarehouseReceiptEntity receipt = warehouseReceiptRepository.save(
            WarehouseReceiptEntity.builder()
                .item(stock.getItem())
                .stock(stock)
                .supplier(supplier)
                .purchaseOrder(purchaseOrder)
                .purchaseOrderItem(purchaseOrderItem)
                .supplierName(supplier != null ? supplier.getName() : (isBlank(supplierName) ? null : supplierName.trim()))
                .referenceNumber(isBlank(referenceNumber) ? null : referenceNumber.trim())
                .quantityReceived(quantityReceived)
                .receivedUom(isBlank(receivedUom) ? stock.getItem().getUnit() : receivedUom.trim())
                .unitsPerPack(safeUnitsPerPack)
                .baseQuantityReceived(baseQuantityReceived)
                .batchNumber(isBlank(batchNumber) ? null : batchNumber.trim())
                .expiryDate(expiryDate)
                .orderedQuantity(orderedQuantity)
                .shortageQuantity(safeShortage)
                .damagedQuantity(safeDamaged)
                .quantityBefore(quantityBefore)
                .quantityAfter(quantityAfter)
                .unitCost(unitCost)
                .invoiceNumber(isBlank(invoiceNumber) ? null : invoiceNumber.trim())
                .receiptStatus(receiptStatus)
                .resolutionStatus(receiptStatus == WarehouseReceiptEntity.ReceiptStatus.RECEIVED_WITH_DISCREPANCY
                    ? WarehouseReceiptEntity.ResolutionStatus.OPEN
                    : WarehouseReceiptEntity.ResolutionStatus.NOT_REQUIRED)
                .returnStatus(receiptStatus == WarehouseReceiptEntity.ReceiptStatus.RECEIVED_WITH_DISCREPANCY
                    ? WarehouseReceiptEntity.ReturnStatus.PENDING
                    : WarehouseReceiptEntity.ReturnStatus.NOT_REQUIRED)
                .notes(isBlank(notes) ? null : notes.trim())
                .receivedAt(LocalDateTime.now())
                .receivedBy(receivedBy)
                .build()
        );

        warehouseStockLotRepository.save(
            WarehouseStockLotEntity.builder()
                .stock(stock)
                .item(stock.getItem())
                .supplier(supplier)
                .sourceReceipt(receipt)
                .batchNumber(isBlank(batchNumber) ? null : batchNumber.trim())
                .expiryDate(expiryDate)
                .receivedUom(isBlank(receivedUom) ? stock.getItem().getUnit() : receivedUom.trim())
                .unitsPerPack(safeUnitsPerPack)
                .quantityReceived(quantityReceived)
                .baseQuantityReceived(baseQuantityReceived)
                .remainingQuantity(baseQuantityReceived)
                .unitCost(unitCost)
                .referenceNumber(isBlank(referenceNumber) ? null : referenceNumber.trim())
                .invoiceNumber(isBlank(invoiceNumber) ? null : invoiceNumber.trim())
                .notes(isBlank(notes) ? null : notes.trim())
                .receivedAt(receipt.getReceivedAt())
                .receivedBy(receivedBy)
                .build()
        );

        governanceService.logAction(
            receivedBy,
            "WAREHOUSE",
            "STOCK_RECEIVED",
            "WAREHOUSE_RECEIPT",
            receipt.getId(),
            "Received stock for " + stock.getItem().getName(),
            "Quantity: " + baseQuantityReceived + " " + stock.getItem().getUnit() + ", supplier: "
                + (supplier != null ? supplier.getName() : "manual")
                + (purchaseOrder != null ? ", PO: " + purchaseOrder.getPoNumber() : ""));
        if (receiptStatus == WarehouseReceiptEntity.ReceiptStatus.RECEIVED_WITH_DISCREPANCY) {
            BigDecimal discrepancyQty = safeShortage.add(safeDamaged)
                .add(orderedQuantity != null ? orderedQuantity.subtract(quantityReceived).max(BigDecimal.ZERO) : BigDecimal.ZERO);
            governanceService.triggerRuleException(
                "GRN_DISCREPANCY",
                discrepancyQty,
                receivedBy,
                "WAREHOUSE",
                "WAREHOUSE_RECEIPT",
                receipt.getId(),
                "GRN discrepancy recorded",
                stock.getItem().getName() + " was received with a discrepancy",
                "shortage=" + safeShortage + ", damaged=" + safeDamaged + ", ordered=" + orderedQuantity + ", received=" + quantityReceived
            );
            governanceService.notifyUsers(
                governanceService.getApprovedUsersByRoles(List.of(
                    UserEntity.Role.ADMIN,
                    UserEntity.Role.WAREHOUSE_ADMIN,
                    UserEntity.Role.WAREHOUSE_MANAGER)),
                "GRN_DISCREPANCY",
                "GRN discrepancy recorded",
                stock.getItem().getName() + " was received with shortage or damage",
                "/grn",
                "WAREHOUSE_RECEIPT",
                receipt.getId());
        }

        log.info("Warehouse stock received for item: {} +{} => {}",
            stock.getItem().getName(), quantityReceived, quantityAfter);

        return toReceiptResponse(receipt);
    }

    @Transactional
    public WarehouseReceiptResponse resolveReceiptDiscrepancy(
        UUID receiptId,
        WarehouseReceiptEntity.ResolutionStatus resolutionStatus,
        String resolutionNotes,
        UserEntity resolvedBy
    ) {
        WarehouseReceiptEntity receipt = warehouseReceiptRepository.findDetailedById(receiptId)
            .orElseThrow(() -> new ResourceNotFoundException("Receipt not found: " + receiptId));

        if (receipt.getReceiptStatus() != WarehouseReceiptEntity.ReceiptStatus.RECEIVED_WITH_DISCREPANCY) {
            throw new IllegalArgumentException("Only discrepancy receipts can be resolved");
        }
        if (resolutionStatus == null || resolutionStatus == WarehouseReceiptEntity.ResolutionStatus.NOT_REQUIRED) {
            throw new IllegalArgumentException("A valid discrepancy resolution status is required");
        }

        receipt.setResolutionStatus(resolutionStatus);
        receipt.setResolutionNotes(isBlank(resolutionNotes) ? null : resolutionNotes.trim());
        receipt.setResolvedAt(LocalDateTime.now());
        receipt.setResolvedBy(resolvedBy);

        if (resolutionStatus == WarehouseReceiptEntity.ResolutionStatus.CLOSED
            && (receipt.getReturnedQuantity() == null || receipt.getReturnedQuantity().compareTo(BigDecimal.ZERO) == 0)) {
            receipt.setReturnStatus(WarehouseReceiptEntity.ReturnStatus.NOT_REQUIRED);
        }

        WarehouseReceiptEntity saved = warehouseReceiptRepository.save(receipt);
        governanceService.logAction(
            resolvedBy,
            "WAREHOUSE",
            "GRN_DISCREPANCY_RESOLVED",
            "WAREHOUSE_RECEIPT",
            saved.getId(),
            "Resolved discrepancy for " + saved.getItem().getName(),
            "Resolution: " + resolutionStatus.name());

        return toReceiptResponse(saved);
    }

    @Transactional
    public WarehouseReceiptResponse recordVendorReturn(
        UUID receiptId,
        BigDecimal returnedQuantity,
        String returnReference,
        String returnNotes,
        UserEntity returnedBy
    ) {
        WarehouseReceiptEntity receipt = warehouseReceiptRepository.findDetailedById(receiptId)
            .orElseThrow(() -> new ResourceNotFoundException("Receipt not found: " + receiptId));

        if (receipt.getReceiptStatus() != WarehouseReceiptEntity.ReceiptStatus.RECEIVED_WITH_DISCREPANCY) {
            throw new IllegalArgumentException("Only discrepancy receipts can be returned to vendor");
        }
        if (returnedQuantity == null || returnedQuantity.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Returned quantity must be greater than zero");
        }
        BigDecimal maxReturnable = valueOrZero(receipt.getDamagedQuantity());
        if (returnedQuantity.compareTo(maxReturnable) > 0) {
            throw new IllegalArgumentException("Returned quantity cannot exceed damaged quantity");
        }

        receipt.setReturnedQuantity(returnedQuantity);
        receipt.setReturnReference(isBlank(returnReference) ? null : returnReference.trim());
        receipt.setReturnNotes(isBlank(returnNotes) ? null : returnNotes.trim());
        receipt.setReturnedAt(LocalDateTime.now());
        receipt.setReturnStatus(WarehouseReceiptEntity.ReturnStatus.COMPLETED);
        receipt.setResolutionStatus(WarehouseReceiptEntity.ResolutionStatus.RETURN_TO_VENDOR);
        receipt.setResolvedAt(LocalDateTime.now());
        receipt.setResolvedBy(returnedBy);
        if (isBlank(receipt.getResolutionNotes())) {
            receipt.setResolutionNotes("Vendor return recorded");
        }

        WarehouseReceiptEntity saved = warehouseReceiptRepository.save(receipt);
        governanceService.logAction(
            returnedBy,
            "WAREHOUSE",
            "GRN_VENDOR_RETURN_RECORDED",
            "WAREHOUSE_RECEIPT",
            saved.getId(),
            "Recorded vendor return for " + saved.getItem().getName(),
            "Returned quantity: " + returnedQuantity
                + (saved.getSupplier() != null ? ", supplier: " + saved.getSupplier().getName() : ""));
        if (saved.getSupplier() != null) {
            governanceService.triggerRuleException(
                "VENDOR_RETURN",
                returnedQuantity,
                returnedBy,
                "WAREHOUSE",
                "WAREHOUSE_RECEIPT",
                saved.getId(),
                "Vendor return recorded",
                saved.getItem().getName() + " was marked for vendor return",
                "returnedQuantity=" + returnedQuantity + ", supplier=" + saved.getSupplier().getName()
            );
            governanceService.notifyUsers(
                governanceService.getApprovedUsersByRoles(List.of(
                    UserEntity.Role.ADMIN,
                    UserEntity.Role.WAREHOUSE_ADMIN,
                    UserEntity.Role.WAREHOUSE_MANAGER)),
                "GRN_RETURN",
                "Vendor return recorded",
                saved.getItem().getName() + " return recorded against " + saved.getSupplier().getName(),
                "/grn",
                "WAREHOUSE_RECEIPT",
                saved.getId());
        }

        return toReceiptResponse(saved);
    }

    @Transactional
    public WarehouseAdjustmentResponse adjustStock(
        UUID itemId,
        WarehouseStockAdjustmentEntity.AdjustmentType adjustmentType,
        WarehouseStockAdjustmentEntity.ReasonType reasonType,
        UUID lotId,
        BigDecimal quantityValue,
        String reason,
        String notes,
        UserEntity adjustedBy
    ) {
        if (adjustmentType == null) {
            throw new IllegalArgumentException("Adjustment type is required");
        }
        if (quantityValue == null || quantityValue.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Adjustment quantity must be zero or greater");
        }
        if (isBlank(reason)) {
            throw new IllegalArgumentException("Adjustment reason is required");
        }

        WarehouseStockEntity stock = warehouseStockRepository
            .findByItem_Id(itemId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "No warehouse stock for item: " + itemId));
        WarehouseStockLotEntity lot = null;
        if (lotId != null) {
            lot = warehouseStockLotRepository.findById(lotId)
                .orElseThrow(() -> new ResourceNotFoundException("Stock lot not found: " + lotId));
            if (!lot.getItem().getId().equals(itemId)) {
                throw new IllegalArgumentException("Selected lot does not belong to the selected item");
            }
        }

        BigDecimal quantityBefore = stock.getQuantity();
        BigDecimal quantityAfter;
        BigDecimal quantityDelta;

        switch (adjustmentType) {
            case INCREASE -> {
                quantityDelta = quantityValue;
                quantityAfter = quantityBefore.add(quantityValue);
            }
            case DECREASE -> {
                quantityDelta = quantityValue.negate();
                quantityAfter = quantityBefore.subtract(quantityValue);
            }
            case SET_COUNT -> {
                quantityAfter = quantityValue;
                quantityDelta = quantityAfter.subtract(quantityBefore);
            }
            default -> throw new IllegalArgumentException("Unsupported adjustment type");
        }

        if (quantityAfter.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Stock cannot become negative after adjustment");
        }
        if (lot != null && adjustmentType == WarehouseStockAdjustmentEntity.AdjustmentType.DECREASE
            && lot.getRemainingQuantity().compareTo(quantityValue) < 0) {
            throw new IllegalArgumentException("Lot quantity cannot go below zero");
        }

        stock.setQuantity(quantityAfter);
        stock.setLastUpdatedAt(LocalDateTime.now());
        stock.setUpdatedBy(adjustedBy);
        warehouseStockRepository.save(stock);

        if (lot != null && adjustmentType == WarehouseStockAdjustmentEntity.AdjustmentType.DECREASE) {
            lot.setRemainingQuantity(lot.getRemainingQuantity().subtract(quantityValue));
            warehouseStockLotRepository.save(lot);
        }

        WarehouseStockAdjustmentEntity.ImpactType impactType = resolveImpactType(reasonType);

        WarehouseStockAdjustmentEntity adjustment = warehouseStockAdjustmentRepository.save(
            WarehouseStockAdjustmentEntity.builder()
                .item(stock.getItem())
                .stock(stock)
                .lot(lot)
                .adjustmentType(adjustmentType)
                .reasonType(reasonType != null ? reasonType : WarehouseStockAdjustmentEntity.ReasonType.GENERAL)
                .impactType(impactType)
                .quantityDelta(quantityDelta)
                .quantityBefore(quantityBefore)
                .quantityAfter(quantityAfter)
                .reason(reason.trim())
                .notes(isBlank(notes) ? null : notes.trim())
                .adjustedAt(LocalDateTime.now())
                .adjustedBy(adjustedBy)
                .build()
        );

        governanceService.logAction(
            adjustedBy,
            "WAREHOUSE",
            "STOCK_ADJUSTED",
            "WAREHOUSE_ADJUSTMENT",
            adjustment.getId(),
            "Adjusted stock for " + stock.getItem().getName(),
            "Type: " + adjustmentType.name() + ", delta: " + quantityDelta + ", reason: " + reason.trim());
        if (quantityDelta.abs().compareTo(BigDecimal.ZERO) > 0) {
            governanceService.triggerRuleException(
                "LARGE_STOCK_ADJUSTMENT",
                quantityDelta.abs(),
                adjustedBy,
                "WAREHOUSE",
                "WAREHOUSE_ADJUSTMENT",
                adjustment.getId(),
                "Large stock adjustment recorded",
                stock.getItem().getName() + " stock was adjusted by " + quantityDelta.abs() + " " + stock.getItem().getUnit(),
                "type=" + adjustmentType.name() + ", reasonType=" + (reasonType != null ? reasonType.name() : "GENERAL") + ", reason=" + reason.trim()
            );
        }

        log.info("Warehouse stock adjusted for item: {} {} => {}",
            stock.getItem().getName(), quantityDelta, quantityAfter);

        return toAdjustmentResponse(adjustment);
    }

    private WarehouseStockResponse toResponse(WarehouseStockEntity e) {
        return WarehouseStockResponse.builder()
            .id(e.getId())
            .itemId(e.getItem().getId())
            .itemCode(e.getItem().getCode())
            .itemName(e.getItem().getName())
            .category(e.getItem().getCategory() != null
                ? e.getItem().getCategory().getName() : null)
            .unit(e.getItem().getUnit())
            .quantity(e.getQuantity())
            .minLevel(e.getMinLevel())
            .maxLevel(e.getMaxLevel())
            .stockStatus(e.getStockStatus().name())
            .lastUpdatedAt(e.getLastUpdatedAt())
            .updatedByName(e.getUpdatedBy() != null ? e.getUpdatedBy().getName() : null)
            .build();
    }

    private WarehouseReceiptResponse toReceiptResponse(WarehouseReceiptEntity e) {
        return WarehouseReceiptResponse.builder()
            .id(e.getId())
            .itemId(e.getItem().getId())
            .itemCode(e.getItem().getCode())
            .itemName(e.getItem().getName())
            .category(e.getItem().getCategory() != null
                ? e.getItem().getCategory().getName() : null)
            .unit(e.getItem().getUnit())
            .supplierId(e.getSupplier() != null ? e.getSupplier().getId() : null)
            .supplierName(e.getSupplier() != null ? e.getSupplier().getName() : e.getSupplierName())
            .purchaseOrderId(e.getPurchaseOrder() != null ? e.getPurchaseOrder().getId() : null)
            .purchaseOrderItemId(e.getPurchaseOrderItem() != null ? e.getPurchaseOrderItem().getId() : null)
            .purchaseOrderNumber(e.getPurchaseOrder() != null ? e.getPurchaseOrder().getPoNumber() : null)
            .referenceNumber(e.getReferenceNumber())
            .quantityReceived(e.getQuantityReceived())
            .receivedUom(e.getReceivedUom())
            .unitsPerPack(e.getUnitsPerPack())
            .baseQuantityReceived(e.getBaseQuantityReceived())
            .batchNumber(e.getBatchNumber())
            .expiryDate(e.getExpiryDate())
            .orderedQuantity(e.getOrderedQuantity())
            .shortageQuantity(e.getShortageQuantity())
            .damagedQuantity(e.getDamagedQuantity())
            .quantityBefore(e.getQuantityBefore())
            .quantityAfter(e.getQuantityAfter())
            .unitCost(e.getUnitCost())
            .invoiceNumber(e.getInvoiceNumber())
            .receiptStatus(e.getReceiptStatus() != null ? e.getReceiptStatus().name() : null)
            .notes(e.getNotes())
            .resolutionStatus(e.getResolutionStatus() != null ? e.getResolutionStatus().name() : null)
            .resolutionNotes(e.getResolutionNotes())
            .resolvedAt(e.getResolvedAt())
            .resolvedByName(e.getResolvedBy() != null ? e.getResolvedBy().getName() : null)
            .returnStatus(e.getReturnStatus() != null ? e.getReturnStatus().name() : null)
            .returnedQuantity(e.getReturnedQuantity())
            .returnReference(e.getReturnReference())
            .returnNotes(e.getReturnNotes())
            .returnedAt(e.getReturnedAt())
            .receivedAt(e.getReceivedAt())
            .receivedByName(e.getReceivedBy() != null ? e.getReceivedBy().getName() : null)
            .build();
    }

    private WarehouseStockLotResponse toLotResponse(WarehouseStockLotEntity e) {
        return WarehouseStockLotResponse.builder()
            .id(e.getId())
            .itemId(e.getItem().getId())
            .itemCode(e.getItem().getCode())
            .itemName(e.getItem().getName())
            .category(e.getItem().getCategory() != null ? e.getItem().getCategory().getName() : null)
            .stockUnit(e.getItem().getUnit())
            .receivedUom(e.getReceivedUom())
            .unitsPerPack(e.getUnitsPerPack())
            .quantityReceived(e.getQuantityReceived())
            .baseQuantityReceived(e.getBaseQuantityReceived())
            .remainingQuantity(e.getRemainingQuantity())
            .batchNumber(e.getBatchNumber())
            .expiryDate(e.getExpiryDate())
            .lotStatus(e.getLotStatus())
            .supplierName(e.getSupplier() != null ? e.getSupplier().getName() : null)
            .unitCost(e.getUnitCost())
            .referenceNumber(e.getReferenceNumber())
            .invoiceNumber(e.getInvoiceNumber())
            .receivedAt(e.getReceivedAt())
            .receivedByName(e.getReceivedBy() != null ? e.getReceivedBy().getName() : null)
            .build();
    }

    private WarehouseAdjustmentResponse toAdjustmentResponse(WarehouseStockAdjustmentEntity e) {
        return WarehouseAdjustmentResponse.builder()
            .id(e.getId())
            .itemId(e.getItem().getId())
            .itemCode(e.getItem().getCode())
            .itemName(e.getItem().getName())
            .category(e.getItem().getCategory() != null
                ? e.getItem().getCategory().getName() : null)
            .unit(e.getItem().getUnit())
            .adjustmentType(e.getAdjustmentType().name())
            .reasonType(e.getReasonType() != null ? e.getReasonType().name() : null)
            .impactType(e.getImpactType() != null ? e.getImpactType().name() : null)
            .lotId(e.getLot() != null ? e.getLot().getId() : null)
            .batchNumber(e.getLot() != null ? e.getLot().getBatchNumber() : null)
            .quantityDelta(e.getQuantityDelta())
            .quantityBefore(e.getQuantityBefore())
            .quantityAfter(e.getQuantityAfter())
            .reason(e.getReason())
            .notes(e.getNotes())
            .adjustedAt(e.getAdjustedAt())
            .adjustedByName(e.getAdjustedBy() != null ? e.getAdjustedBy().getName() : null)
            .build();
    }

    private WarehouseStockAdjustmentEntity.ImpactType resolveImpactType(
        WarehouseStockAdjustmentEntity.ReasonType reasonType
    ) {
        if (reasonType == null) {
            return WarehouseStockAdjustmentEntity.ImpactType.GENERAL;
        }
        return switch (reasonType) {
            case WASTAGE, SPOILAGE, EXPIRED, DAMAGE -> WarehouseStockAdjustmentEntity.ImpactType.WASTAGE;
            case DEAD_STOCK -> WarehouseStockAdjustmentEntity.ImpactType.DEAD_STOCK;
            default -> WarehouseStockAdjustmentEntity.ImpactType.GENERAL;
        };
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String normalizeSearch(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private PurchaseOrderEntity.PurchaseOrderStatus resolvePurchaseOrderStatus(PurchaseOrderEntity purchaseOrder) {
        boolean anyReceived = purchaseOrder.getItems().stream()
            .anyMatch(line -> valueOrZero(line.getReceivedQuantity()).compareTo(BigDecimal.ZERO) > 0);
        boolean allReceived = purchaseOrder.getItems().stream()
            .allMatch(line -> valueOrZero(line.getReceivedQuantity()).compareTo(valueOrZero(line.getOrderedQuantity())) >= 0);

        if (allReceived) {
            return PurchaseOrderEntity.PurchaseOrderStatus.RECEIVED;
        }
        if (anyReceived) {
            return PurchaseOrderEntity.PurchaseOrderStatus.PARTIALLY_RECEIVED;
        }
        return purchaseOrder.getPoStatus() == PurchaseOrderEntity.PurchaseOrderStatus.DRAFT
            ? PurchaseOrderEntity.PurchaseOrderStatus.DRAFT
            : PurchaseOrderEntity.PurchaseOrderStatus.SENT;
    }

    private void autosize(Sheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private Map<String, Integer> mapHeaders(Row headerRow) {
        Map<String, Integer> headers = new LinkedHashMap<>();
        for (Cell cell : headerRow) {
            String key = dataFormatter.formatCellValue(cell)
                .trim()
                .toLowerCase(Locale.ENGLISH);
            if (!key.isEmpty()) {
                headers.put(key, cell.getColumnIndex());
            }
        }
        return headers;
    }

    private boolean isBlankRow(Row row) {
        for (Cell cell : row) {
            if (cell.getCellType() != CellType.BLANK && !dataFormatter.formatCellValue(cell).trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private String readString(Row row, Integer index) {
        if (index == null) {
            return null;
        }
        Cell cell = row.getCell(index);
        return cell == null ? null : dataFormatter.formatCellValue(cell).trim();
    }

    private BigDecimal readDecimal(Row row, Integer index) {
        String value = readString(row, index);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Invalid number '" + value + "'");
        }
    }

    private double toDouble(BigDecimal value) {
        return value != null ? value.doubleValue() : 0d;
    }
}
