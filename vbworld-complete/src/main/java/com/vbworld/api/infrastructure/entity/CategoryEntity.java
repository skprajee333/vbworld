package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "categories")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CategoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", columnDefinition = "integer")
    private Integer id;

    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private int sortOrder = 0;
}
