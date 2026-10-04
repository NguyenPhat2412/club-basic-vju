# API inventory

The only backend currently assigned to this system is `backend/springboot`.

The runtime catalog is available at:

```text
GET http://localhost:8080/api/v1/api-catalog
```

The source catalog is [catalog.yml](catalog.yml). The runtime copy is `backend/springboot/src/main/resources/api/catalog.yml`; keep both files synchronized when an endpoint changes.

## Status meanings

- `IMPLEMENTED`: a callable controller exists and has an automated test.
- `PLANNED`: the route is part of the phase-1 contract, but no callable business controller exists yet.

All 36 phase-1 routes are marked `IMPLEMENTED`; each is covered by the PostgreSQL MockMvc integration suite. The contract also includes password change, current-user permissions, user permission listing, and department-member move.

Every catalog entry names `backend/springboot` as its owner so the frontend has one place to check implementation status.

## Frontend contract

The complete phase-1 contract is [openapi.yaml](openapi.yaml). Import it into Swagger Editor, Postman, or an OpenAPI client generator. The backend uses JWT bearer access tokens; send `Authorization: Bearer <accessToken>` for protected routes. `GET /api/v1/users/me` and `GET /api/v1/users/me/permissions` require login but do not require an administration permission. List endpoints use `offset` and `limit` (maximum 100). The API returns RFC 7807 errors with a stable `code` property.

## Swagger/OpenAPI workflow

- Contract source for frontend: `docs/api/openapi.yaml`.
- Runtime copy packaged by the backend: `classpath:/api/phase1-openapi.yaml`.
- Swagger UI: `http://localhost:8080/swagger-ui.html`.
- Generated JSON: `http://localhost:8080/v3/api-docs`.
- Downloadable YAML: `http://localhost:8080/api-docs/phase1.yaml`.

The OpenAPI server URL already includes `/api/v1`; therefore generated client calls append paths such as `/clubs`, not `/api/v1/clubs`. Protected operations use `Authorization: Bearer <accessToken>`. The contract uses `offset`/`limit` and typed list envelopes (`items`, `total`, `offset`, `limit`) to match the service DTOs. `x-permission` documents the permission checked by the backend and `x-implementation-status` is kept in sync with the catalog.

Run the contract checks with:

```bash
python3 -m unittest discover -s docs/api/tests -v
```

## Scope rules frontend must reflect

- `GLOBAL` grants omit `clubId` and `departmentId`.
- `CLUB` grants include `clubId`; `DEPARTMENT` grants include `departmentId`.
- `permissionId` is the permission-definition ID. A grant ID is returned in `UserPermission.id` and is not accepted in the grant endpoint.
- Revoke calls should send `scope` and its target ID. If more than one active grant matches an underspecified revoke, the backend returns `400 AMBIGUOUS_PERMISSION_GRANT`.
- Status operations choose their permission from the target status: `user.active`/`user.inactive`, `club.active`/`club.inactive`, and `department.activate`/`department.inactive`.
- Department move uses the source department in the URL and `targetDepartmentId` in the body. It requires remove permission at the source and add permission at the target.
