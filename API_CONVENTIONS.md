# API Conventions

This document is the authoritative reference for how the Splitwise API is structured, versioned, and consumed by web and mobile clients.

---

## 1. Versioning

### URL Prefix

All public API endpoints are prefixed with `/api/v1/`. Example:

```
GET /api/v1/groups
POST /api/v1/auth/login
```

### Deprecation Policy

- A new major version (e.g. `/api/v2/`) will be introduced for breaking changes.
- Deprecated endpoints will return a `Sunset` response header indicating the removal date:
  ```
  Sunset: Sat, 01 Jan 2026 00:00:00 GMT
  Deprecation: true
  ```
- Clients should monitor for `Sunset` headers and migrate before that date.
- Old versions will be supported for a minimum of **6 months** after the new version ships.

---

## 2. Authentication

All protected endpoints require a **Bearer JWT** token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Obtain a token via:

```
POST /api/v1/auth/login
```

### HTTP Status Codes for Auth

| Code | Meaning |
|------|---------|
| 401  | Not authenticated — token missing, expired, or invalid |
| 403  | Forbidden — authenticated but lacks permission for the resource |

---

## 3. Error Format

All errors return a consistent JSON body:

```json
{
  "error": {
    "code": "not_found",
    "message": "Group not found",
    "field": null
  },
  "request_id": "req_abc123"
}
```

### Schema

```python
class ErrorDetail(BaseModel):
    code: str        # machine-readable, e.g. "not_found", "forbidden", "validation_error"
    message: str     # human-readable description
    field: Optional[str]  # set for field-level validation errors

class ErrorResponse(BaseModel):
    error: ErrorDetail
    request_id: Optional[str]  # correlation ID for tracing
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `not_found` | 404 | Resource does not exist or user lacks access |
| `forbidden` | 403 | User is authenticated but not authorized |
| `unauthorized` | 401 | Missing or invalid authentication token |
| `validation_error` | 422 | Request body/params failed validation |
| `rate_limited` | 429 | Too many requests |

---

## 4. Pagination

> ⚠️ **Breaking Change Notice (introduced in fix/issue-37):** List endpoints have migrated from a flat array response
> to a paginated envelope format. Clients that previously expected a plain JSON array will need
> to update to read `response.items`. All paginated endpoints return an
> ⚠️ **Breaking Change Notice (introduced in fix/issue-37):** List endpoints have migrated from a flat array
> response to a paginated envelope format. Clients that previously expected a plain JSON array will need to
> update to read `response.items`. All paginated endpoints return an
> `X-API-Change: list-endpoints-now-paginated` response header as a soft migration signal.
> Plan to update clients before this change reaches production.

All list endpoints use **offset-based pagination** via `page` and `page_size` query parameters.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | int ≥ 1 | `1` | Page number (1-indexed) |
| `page_size` | int 1–100 | `20` | Number of items per page |

### Response Shape

```json
{
  "items": [...],
  "total": 42,
  "page": 2,
  "page_size": 20,
  "has_next": true
}
```

### Schema

```python
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
```

### Paginated Endpoints

- `GET /api/v1/groups`
- `GET /api/v1/groups/{group_id}/expenses`

---

## 5. ID Conventions

- All resource IDs are **UUID v4** (`uuid.UUID` in Python / string in JSON).
- Example: `"3fa85f64-5717-4562-b3fc-2c963f66afa6"`
- Never use sequential integers for public IDs.

---

## 6. Naming & Format Conventions

| Convention | Rule |
|------------|------|
| Field names | `snake_case` |
| Timestamps | ISO 8601 UTC: `"2024-05-01T12:00:00Z"` |
| Amounts | Decimal string or number (avoid float precision issues) |
| Currency | ISO 4217 string, e.g. `"USD"`, `"EUR"` |

---

## 7. OpenAPI Schema

The live OpenAPI schema is served at:

```
GET /openapi.json
GET /docs       (Swagger UI)
GET /redoc      (ReDoc)
```

The schema is the source of truth for the public API surface. All new endpoints must be reflected in the schema with proper tags, descriptions, and response models.

---

## 8. Example Request/Response Pairs

### 8.1 List Groups

**Request**
```http
GET /api/v1/groups?page=1&page_size=2
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "name": "Trip to NYC",
      "description": "Summer trip expenses",
      "created_by": "a1b2c3d4-0000-0000-0000-000000000001",
      "created_at": "2024-05-01T10:00:00Z",
      "updated_at": "2024-05-01T10:00:00Z"
    },
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "name": "Apartment",
      "description": null,
      "created_by": "a1b2c3d4-0000-0000-0000-000000000001",
      "created_at": "2024-04-01T08:00:00Z",
      "updated_at": "2024-04-01T08:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "page_size": 2,
  "has_next": true
}
```

---

### 8.2 List Expenses

**Request**
```http
GET /api/v1/groups/3fa85f64-5717-4562-b3fc-2c963f66afa6/expenses?page=1&page_size=20
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "items": [
    {
      "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "group_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "payer_id": "a1b2c3d4-0000-0000-0000-000000000001",
      "description": "Hotel",
      "amount": "300.00",
      "currency": "USD",
      "created_at": "2024-05-10T14:00:00Z",
      "splits": [
        {
          "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
          "amount": "150.00",
          "is_settled": false
        },
        {
          "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "user_id": "b2c3d4e5-0000-0000-0000-000000000002",
          "amount": "150.00",
          "is_settled": false
        }
      ]
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20,
  "has_next": false
}
```

---

### 8.3 Get Group Balances

**Request**
```http
GET /api/v1/groups/3fa85f64-5717-4562-b3fc-2c963f66afa6/balances
Authorization: Bearer <token>
```

**Response** `200 OK`
```json
{
  "group_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "balances": [
    {
      "from_user_id": "b2c3d4e5-0000-0000-0000-000000000002",
      "to_user_id": "a1b2c3d4-0000-0000-0000-000000000001",
      "amount": "150.00"
    }
  ],
  "net": {
    "a1b2c3d4-0000-0000-0000-000000000001": "150.00",
    "b2c3d4e5-0000-0000-0000-000000000002": "-150.00"
  }
}
```
