package com.vbworld.api.infrastructure.repository;

import com.vbworld.api.infrastructure.entity.DeliveryRouteEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface DeliveryRouteRepository extends JpaRepository<DeliveryRouteEntity, UUID> {

    @EntityGraph(attributePaths = {"routeIndents", "routeIndents.indent", "routeIndents.indent.branch"})
    List<DeliveryRouteEntity> findByRouteDateOrderByDeliverySlotAscCreatedAtAsc(LocalDate routeDate);
}
