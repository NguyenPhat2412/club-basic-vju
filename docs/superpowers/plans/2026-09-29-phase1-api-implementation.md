# Phase 1 API implementation plan

1. Stabilize auth/security: fix JWT configuration, refresh-token rotation, error handling, and OpenAPI dependency/configuration.
2. Add user/profile module with list/detail/update/status endpoints and pagination.
3. Add club and department modules with CRUD/status operations and scoped permission checks.
4. Add membership and department-member modules with uniqueness and status rules.
5. Add permission catalog/assignment module with scope validation and audit logs.
6. Add OpenAPI 3.1 contract, Swagger UI configuration, catalog synchronization, and frontend README.
7. Add focused tests for services/controllers/security and run full Maven, migration, OpenAPI, and Compose checks.
