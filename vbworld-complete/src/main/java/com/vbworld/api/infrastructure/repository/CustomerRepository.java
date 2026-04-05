package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.CustomerEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<CustomerEntity, UUID> {

    @EntityGraph(attributePaths = {"branch"})
    Optional<CustomerEntity> findByPhone(String phone);

    @EntityGraph(attributePaths = {"branch"})
    List<CustomerEntity> findTop50ByOrderByLastVisitAtDesc();

    @EntityGraph(attributePaths = {"branch"})
    List<CustomerEntity> findTop50ByBranch_IdOrderByLastVisitAtDesc(UUID branchId);

    @EntityGraph(attributePaths = {"branch"})
    @Query("""
        SELECT c FROM CustomerEntity c
        WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%'))
        ORDER BY c.lastVisitAt DESC NULLS LAST, c.updatedAt DESC
        """)
    List<CustomerEntity> searchAll(@Param("search") String search);

    @EntityGraph(attributePaths = {"branch"})
    @Query("""
        SELECT c FROM CustomerEntity c
        WHERE c.branch.id = :branchId
          AND (
            LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(c.phone) LIKE LOWER(CONCAT('%', :search, '%'))
          )
        ORDER BY c.lastVisitAt DESC NULLS LAST, c.updatedAt DESC
        """)
    List<CustomerEntity> searchByBranch(@Param("branchId") UUID branchId, @Param("search") String search);
}
