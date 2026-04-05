package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.BranchTransferEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface BranchTransferRepository extends JpaRepository<BranchTransferEntity, UUID> {

    @Query("""
        SELECT t FROM BranchTransferEntity t
        JOIN FETCH t.item i
        JOIN FETCH t.destinationBranch b
        LEFT JOIN FETCH t.transferredBy tb
        LEFT JOIN FETCH t.receivedBy rb
        ORDER BY t.transferredAt DESC
        """)
    List<BranchTransferEntity> findRecentTransfers();

    @Query("""
        SELECT t FROM BranchTransferEntity t
        JOIN FETCH t.item i
        JOIN FETCH t.destinationBranch b
        LEFT JOIN FETCH t.transferredBy tb
        LEFT JOIN FETCH t.receivedBy rb
        WHERE LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(i.code) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(b.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(t.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
        ORDER BY t.transferredAt DESC
        """)
    List<BranchTransferEntity> findRecentTransfersBySearch(String search);

    @Query("""
        SELECT t FROM BranchTransferEntity t
        JOIN FETCH t.item i
        JOIN FETCH t.destinationBranch b
        LEFT JOIN FETCH t.transferredBy tb
        LEFT JOIN FETCH t.receivedBy rb
        WHERE b.id = :branchId
        ORDER BY t.transferredAt DESC
        """)
    List<BranchTransferEntity> findRecentTransfersForBranch(UUID branchId);

    @Query("""
        SELECT t FROM BranchTransferEntity t
        JOIN FETCH t.item i
        JOIN FETCH t.destinationBranch b
        LEFT JOIN FETCH t.transferredBy tb
        LEFT JOIN FETCH t.receivedBy rb
        WHERE b.id = :branchId
          AND (
            LOWER(i.name) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(i.code) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(t.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
          )
        ORDER BY t.transferredAt DESC
        """)
    List<BranchTransferEntity> findRecentTransfersForBranchBySearch(UUID branchId, String search);
}
