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
