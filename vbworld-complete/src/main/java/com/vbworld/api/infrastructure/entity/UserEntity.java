package com.vbworld.api.infrastructure.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.io.Serial;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserEntity implements UserDetails {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private BranchEntity branch;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override public String getPassword()              { return passwordHash; }
    @Override public String getUsername()              { return email; }
    @Override public boolean isEnabled()               { return active && status == Status.APPROVED; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }

    // Convenience helpers
    public boolean isAdmin()           { return role == Role.ADMIN; }
    public boolean isWarehouseAdmin()  { return role == Role.WAREHOUSE_ADMIN; }
    public boolean isWarehouse()       { return role == Role.WAREHOUSE_MANAGER || role == Role.WAREHOUSE_ADMIN; }
    public boolean isRestaurant()      { return role == Role.RESTAURANT_STAFF; }
    public boolean canManageUsers()    { return role == Role.ADMIN || role == Role.WAREHOUSE_ADMIN; }

    public enum Role {
        ADMIN,
        WAREHOUSE_ADMIN,      // Warehouse manager WITH user management access
        WAREHOUSE_MANAGER,    // Regular warehouse manager (stock + orders only)
        RESTAURANT_STAFF
    }

    public enum Status {
        PENDING,
        APPROVED,
        REJECTED
    }
}
