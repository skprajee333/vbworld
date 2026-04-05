package com.vbworld.api.application.service;

import com.vbworld.api.domain.exception.DuplicateResourceException;
import com.vbworld.api.domain.exception.ResourceNotFoundException;
import com.vbworld.api.infrastructure.entity.CategoryEntity;
import com.vbworld.api.infrastructure.entity.ItemEntity;
import com.vbworld.api.infrastructure.repository.CategoryRepository;
import com.vbworld.api.infrastructure.repository.ItemRepository;
import com.vbworld.api.presentation.dto.response.ItemResponse;
import com.vbworld.api.presentation.dto.response.PagedResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ItemService {

    private final ItemRepository     itemRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public PagedResponse<ItemResponse> searchItems(
        String search, Integer categoryId, int page, int size
    ) {
        var pageable = PageRequest.of(page, size);
        String normalizedSearch = search == null ? "" : search.trim();
        var result   = itemRepository.searchItems(
            normalizedSearch,
            categoryId, pageable
        );
        return PagedResponse.from(result.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<CategoryEntity> getCategories() {
        return categoryRepository.findAllByOrderBySortOrderAsc();
    }

    @Transactional
    public ItemResponse createItem(
        String code, String name, Integer categoryId,
        String unit, BigDecimal reorderLevel, BigDecimal salePrice
    ) {
        if (code != null && itemRepository.existsByCode(code)) {
            throw new DuplicateResourceException("Item code already exists: " + code);
        }

        CategoryEntity category = null;
        if (categoryId != null) {
            category = categoryRepository.findById(categoryId).orElse(null);
        }

        ItemEntity item = ItemEntity.builder()
            .code(code)
            .name(name)
            .category(category)
            .unit(unit != null ? unit : "Nos")
            .reorderLevel(reorderLevel != null ? reorderLevel : BigDecimal.TEN)
            .salePrice(salePrice != null ? salePrice : BigDecimal.ZERO)
            .active(true)
            .build();

        return toResponse(itemRepository.save(item));
    }

    @Transactional
    public ItemResponse updateItem(
        UUID id, String name, Integer categoryId,
        String unit, BigDecimal reorderLevel, BigDecimal salePrice, Boolean active
    ) {
        ItemEntity item = itemRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Item not found: " + id));

        if (name         != null) item.setName(name);
        if (unit         != null) item.setUnit(unit);
        if (reorderLevel != null) item.setReorderLevel(reorderLevel);
        if (salePrice    != null) item.setSalePrice(salePrice);
        if (active       != null) item.setActive(active);
        if (categoryId   != null) {
            Optional<CategoryEntity> cat = categoryRepository.findById(categoryId);
            cat.ifPresent(item::setCategory);
        }

        return toResponse(itemRepository.save(item));
    }

    private ItemResponse toResponse(ItemEntity e) {
        return ItemResponse.builder()
            .id(e.getId())
            .code(e.getCode())
            .name(e.getName())
            .category(e.getCategory() != null ? e.getCategory().getName() : null)
            .unit(e.getUnit())
            .reorderLevel(e.getReorderLevel())
            .salePrice(e.getSalePrice())
            .active(e.isActive())
            .build();
    }
}
