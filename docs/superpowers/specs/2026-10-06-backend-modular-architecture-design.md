# Backend Modular Architecture Refactoring Design

## Goal

Restructure the Spring Boot backend in `club-basic-vju/backend/springboot` to strictly conform to the Modular Architecture pattern specified by the user:
- Group business domains under `com.vju.club.modules.<module_name>`
- Each module contains: `annotation`, `common`, `config/request`, `config/response`, `controller`, `entity`, `mapper`, `repository`, `service` (Interface), and `service/impl` (Implementation class named `I<Feature>Service`)
- Maintain shared core packages under `com.vju.club`: `common`, `config`, `error`, `security`, `bootstrap`, `rest`
- Eliminate root name collisions (`com.vju.club.ClubApplication` vs `application` package)
- Remove untracked stray directory `src/main/com.vju.club`
- Ensure 100% backwards compatibility with all 353 existing unit, integration, and security tests.

## Naming & Layering Convention

Per explicit user requirement:
- **Service Interface:** Named `<Feature>Service` (e.g., `ClubService`, `UserService`, `DepartmentService`) located directly in `com.vju.club.modules.<feature>.service`
- **Service Implementation:** Named `I<Feature>Service` (e.g., `IClubService`, `IUserService`, `IDepartmentService`) annotated with `@Service` and located in `com.vju.club.modules.<feature>.service.impl`
- **DTOs:**
  - Request DTOs placed in `com.vju.club.modules.<feature>.config.request`
  - Response DTOs placed in `com.vju.club.modules.<feature>.config.response`
- **Entities & Repositories:** Placed inside the respective module's `entity` and `repository` packages. Base entities remain in `com.vju.club.common.entity`.
- **Mappers:** Placed in `com.vju.club.modules.<feature>.mapper`.

## Module Mapping

1. **`club`** (`com.vju.club.modules.club`)
   - Entities: `Club`, `ClubStatus`
   - Repository: `ClubRepository`
   - DTOs: `ClubRequest`, `ClubPatchRequest`, `ClubStatusRequest` in `config.request`; `ClubResponse` in `config.response`
   - Service: `ClubService` (Interface), `IClubService` (Impl)
   - Controller: `ClubController`
   - Mapper: `ClubMapper`

2. **`user`** (`com.vju.club.modules.user`)
   - Entities: `User`, `UserStatus`
   - Repository: `UserRepository`
   - DTOs: `UpdateProfileRequest`, `UpdateUserStatusRequest` in `config.request`; `UserResponse` in `config.response`
   - Service: `UserService` (Interface), `IUserService` (Impl)
   - Controller: `UserController`
   - Mapper: `UserMapper`

3. **`department`** (`com.vju.club.modules.department`)
   - Entities: `Department`, `DepartmentStatus`
   - Repository: `DepartmentRepository`
   - DTOs: `DepartmentRequest`, `DepartmentPatchRequest`, `DepartmentStatusRequest` in `config.request`; `DepartmentResponse` in `config.response`
   - Service: `DepartmentService` (Interface), `IDepartmentService` (Impl)
   - Controller: `DepartmentController`
   - Mapper: `DepartmentMapper`

4. **`departmentmember`** (`com.vju.club.modules.departmentmember`)
   - Entities: `DepartmentMember`
   - Repository: `DepartmentMemberRepository`
   - DTOs: `AddDepartmentMemberRequest`, `MoveDepartmentMemberRequest` in `config.request`; `DepartmentMemberResponse` in `config.response`
   - Service: `DepartmentMemberService` (Interface), `IDepartmentMemberService` (Impl)
   - Controller: `DepartmentMemberController`
   - Mapper: `DepartmentMemberMapper`

5. **`membership`** (`com.vju.club.modules.membership`)
   - Entities: `Membership`, `MembershipStatus`
   - Repository: `MembershipRepository`
   - DTOs: `CreateMembershipRequest`, `UpdateMembershipRequest` in `config.request`; `MembershipResponse`, `MyMembershipResponse`, `MembershipDepartmentResponse` in `config.response`
   - Service: `MembershipService` (Interface), `IMembershipService` (Impl)
   - Controller: `MembershipController`
   - Mapper: `MembershipMapper`

6. **`clubapplication`** (`com.vju.club.modules.clubapplication`)
   - Entities: `ClubApplication`, `ClubApplicationStatus`
   - Repository: `ClubApplicationRepository`
   - DTOs: `CreateClubApplicationRequest`, `ReviewClubApplicationRequest` in `config.request`; `ClubApplicationResponse`, `ClubApplicationSummaryResponse` in `config.response`
   - Service: `ClubApplicationService` (Interface), `IClubApplicationService` (Impl)
   - Controller: `ClubApplicationController`
   - Mapper: `ClubApplicationMapper`

7. **`auth`** (`com.vju.club.modules.auth`)
   - Entities: `RefreshToken`
   - Repository: `RefreshTokenRepository`
   - DTOs: `LoginRequest`, `RegisterRequest`, `RefreshTokenRequest`, `ChangePasswordRequest`, `LogoutRequest` in `config.request`; `AuthResponse`, `TokenResponse` in `config.response`
   - Service: `AuthService` (Interface), `IAuthService` (Impl), `JwtTokenService`, `RefreshTokenCleanupJob`
   - Controller: `AuthController`

8. **`audit`** (`com.vju.club.modules.audit`)
   - Entities: `AuditLog`, `AuditAction`, `PermissionAuditLog`, `PermissionAuditAction`
   - Repository: `AuditLogRepository`, `PermissionAuditLogRepository`
   - DTOs: `AuditLogResponse` in `config.response`
   - Service: `AuditService` (Interface), `IAuditService` (Impl), `AuditQueryService`
   - Controller: `AuditController`

9. **`role`** (`com.vju.club.modules.role`)
   - Entities: `Role`, `UserRole`
   - Repository: `RoleRepository`, `UserRoleRepository`
   - DTOs: `AssignRoleRequest`, `CreateRoleRequest`, `UpdateRoleRequest` in `config.request`; `RoleResponse`, `UserRoleResponse` in `config.response`
   - Service: `RoleService` (Interface), `IRoleService` (Impl)
   - Controller: `RoleController`
   - Mapper: `RoleMapper`

10. **`permission`** (`com.vju.club.modules.permission`)
    - Entities: `Permission`, `PermissionScope`, `UserPermission`
    - Repository: `PermissionRepository`, `UserPermissionRepository`
    - DTOs: `GrantPermissionRequest`, `ReplacePermissionsRequest` in `config.request`; `PermissionResponse`, `PermissionGroupResponse`, `EffectivePermissionResponse`, `UserPermissionResponse` in `config.response`
    - Service: `PermissionService` (Interface), `IPermissionService` (Impl)
    - Controller: `PermissionController`

11. **`notification`** (`com.vju.club.modules.notification`)
    - Entities: `Notification`
    - Repository: `NotificationRepository`
    - DTOs: `NotificationResponse` in `config.response`
    - Service: `NotificationService` (Interface), `INotificationService` (Impl)
    - Controller: `NotificationController`

## Core Shared Packages

- `com.vju.club.common.entity`: `BaseEntity`, `CreatedEntity`, `TimestampedEntity`
- `com.vju.club.common.dto`: `PageResponse`, `OffsetLimitRequest`
- `com.vju.club.config`: Global configuration classes
- `com.vju.club.security`: Security filters, providers, token utilities
- `com.vju.club.error`: Global exception handlers and error response models
- `com.vju.club.bootstrap`: Admin bootstrap & demo data seeding
- `com.vju.club.rest`: OpenAPI & API catalog controllers

## Migration Plan & Safety

1. Clean up stray directory `backend/springboot/src/main/com.vju.club`.
2. Move base entities to `com.vju.club.common.entity` (or maintain aliases).
3. Create module folders for each domain with subpackages: `annotation`, `common`, `config/request`, `config/response`, `controller`, `entity`, `mapper`, `repository`, `service`, `service/impl`.
4. Create Service interfaces (e.g. `ClubService`) and rename implementation classes to `I<Feature>Service` (e.g. `IClubService`) inside `impl`.
5. Move entities, repositories, controllers, DTOs, mappers into their respective modules.
6. Update imports across all production classes.
7. Update imports across all test classes in `src/test/java`.
8. Execute `./mvnw clean test` to verify all 353 tests pass.
