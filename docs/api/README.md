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

At this point only `GET /api/v1/api-catalog` is implemented. Authentication, profile, club, department, membership, department-member, and permission-management routes are planned and are not callable APIs yet.

Every catalog entry names `backend/springboot` as its owner so the frontend has one place to check implementation status.

## Frontend contract

The complete phase-1 contract is [openapi.yaml](openapi.yaml). Import it into Swagger Editor, Postman, or an OpenAPI client generator. The backend uses JWT bearer access tokens; send `Authorization: Bearer <accessToken>` for protected routes. List endpoints use zero-based `page` and `size` (maximum 100). The API returns RFC 7807 errors with a stable `code` property.

## Swagger/OpenAPI workflow

- Contract source for frontend: `docs/api/openapi.yaml`.
- Runtime copy packaged by the backend: `classpath:/api/phase1-openapi.yaml`.
- Swagger UI: `http://localhost:8080/swagger-ui.html` (after the backend adds Springdoc).
- Generated JSON: `http://localhost:8080/v3/api-docs`.
- Downloadable YAML: `http://localhost:8080/api-docs/phase1.yaml`.

The OpenAPI server URL already includes `/api/v1`; therefore generated client calls append paths such as `/clubs`, not `/api/v1/clubs`. Protected operations use `Authorization: Bearer <accessToken>`. The contract uses `offset`/`limit` and typed list envelopes (`items`, `total`, `offset`, `limit`) to match the service DTOs. `x-permission` documents the permission checked by the backend and `x-implementation-status` is kept in sync with the catalog until integration tests pass.

Run the contract checks with:

```bash
python3 -m unittest discover -s docs/api/tests -v
```
