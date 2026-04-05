package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.SupplierEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SupplierRepository extends JpaRepository<SupplierEntity, UUID> {

    Optional<SupplierEntity> findByCodeIgnoreCase(String code);

    @Query("""
        SELECT s FROM SupplierEntity s
        WHERE (:search = ''
            OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(s.code) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(s.contactPerson, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(s.phone, '')) LIKE LOWER(CONCAT('%', :search, '%')))
        ORDER BY s.active DESC, s.name ASC
        """)
    List<SupplierEntity> findAllBySearch(
        @org.springframework.data.repository.query.Param("search") String search
    );
}
