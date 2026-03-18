# Data Model & Product Scope — MVP v0.1

> **Status:** Draft · Covers Splitwise MVP v0.1
> **Last updated:** 2026-03-18

---

## 1. MVP Scope

The MVP ships a single-currency (USD), authenticated expense-splitting backend.  
The goals are:

1. Users can create groups and invite others via a shareable link.
2. Any group member can add expenses; splits are recorded per user.
3. Balances are derived from splits; settlements mark debts as resolved.
4. A clean REST API is the only interface (no real-time or mobile push).

---

## 2. Entities & Fields

### 2.1 User

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK, generated |
| `email` | VARCHAR(255) | Unique, indexed |
| `hashed_password` | VARCHAR(255) | Nullable (OAuth users have no password) |
| `display_name` | VARCHAR(100) | Required |
| `google_id` | VARCHAR(255) | Nullable, unique — for Google OAuth |
| `is_active` | BOOLEAN | Soft-disable flag, default `true` |
| `created_at` | TIMESTAMPTZ | Server default `now()` |

**Invariants**
- `email` must be unique across all users.
- At least one of `hashed_password` or `google_id` must be non-null.

---

### 2.2 Group

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK, generated |
| `name` | VARCHAR(100) | Required |
| `description` | TEXT | Optional |
| `created_by` | UUID (FK → users) | The founding member |
| `created_at` | TIMESTAMPTZ | Server default `now()` |
| `updated_at` | TIMESTAMPTZ | Auto-updated on write |

**Invariants**
- The creator is automatically added as an `admin` member upon group creation.
- A group must always have at least one `admin` member.

---

### 2.3 Membership

Junction table between `User` and `Group`.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID (FK → users) | |
| `group_id` | UUID (FK → groups) | |
| `role` | VARCHAR(20) | `"admin"` or `"member"` |
| `joined_at` | TIMESTAMPTZ | Server default `now()` |

**Invariants**
- `(user_id, group_id)` is unique — a user can only be a member of a group once.
- Only `admin` members may add/remove other members, or revoke invite tokens.

---

### 2.4 Expense

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `group_id` | UUID (FK → groups) | |
| `payer_id` | UUID (FK → users) | User who paid the real-world bill |
| `description` | VARCHAR(255) | Required |
| `amount` | NUMERIC(12, 2) | Total bill amount in cents-compatible decimal |
| `currency` | VARCHAR(3) | ISO 4217; always `"USD"` in MVP |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Nullable; set on edit |

**Invariants**
- `amount > 0`.
- `payer_id` must be an active member of `group_id`.
- Sum of all `Split.amount` values for this expense **must equal** `expense.amount`.
- `currency` is always `"USD"` for MVP (see §4).

---

### 2.5 Split

One row per user who owes a share of an expense.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `expense_id` | UUID (FK → expenses) | Cascade-delete when expense deleted |
| `user_id` | UUID (FK → users) | User who owes this share |
| `amount` | NUMERIC(12, 2) | Amount owed by this user |
| `is_settled` | BOOLEAN | `false` by default |

**Invariants**
- `amount > 0`.
- `user_id` must be a member of the expense's group.
- The payer's own split (if present) represents their net contribution; it is not a debt.

---

### 2.6 Settlement (Payment)

Records that user A has paid user B to settle a balance.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `group_id` | UUID (FK → groups) | |
| `payer_id` | UUID (FK → users) | Who sent money |
| `payee_id` | UUID (FK → users) | Who received money |
| `amount` | NUMERIC(12, 2) | Amount paid |
| `currency` | VARCHAR(3) | Always `"USD"` in MVP |
| `note` | TEXT | Optional free-text |
| `created_at` | TIMESTAMPTZ | |

**Invariants**
- `payer_id ≠ payee_id`.
- Both `payer_id` and `payee_id` must be members of `group_id`.
- `amount > 0`.

---

### 2.7 InviteToken

Time-limited, revocable token for link-based group invites.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `group_id` | UUID (FK → groups) | |
| `token` | VARCHAR(64) | Random, unique, indexed |
| `created_by` | UUID (FK → users) | Must be a group admin |
| `created_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | Nullable — `null` means no expiry |
| `is_revoked` | BOOLEAN | Default `false` |

---

## 3. Currency Handling & Rounding Rules

- **Single currency for MVP:** All amounts are USD. `currency = "USD"` is stored but not processed.
- **Storage format:** `NUMERIC(12, 2)` — two decimal places (i.e., dollar + cents). No floating-point.
- **Input:** API accepts amounts as a decimal string (e.g., `"12.50"`). Values are validated to exactly 2 decimal places.
- **Rounding rule:** When splitting equally, divide integer cents using **round-half-up** (standard banker's rounding is _not_ used). Any leftover cent is assigned to the first split in the list.
  - Example: $10.00 ÷ 3 = $3.33 + $3.33 + **$3.34** (remainder to first split).
- **Invariant:** `SUM(splits.amount) == expense.amount` enforced at write time; API returns 422 if violated.

---

## 4. Scoping Decisions

| Feature | MVP Decision | Rationale |
|---|---|---|
| **Multi-currency** | ❌ Out of scope | Adds FX conversion complexity; not needed for initial use case |
| **Guest users** | ❌ Out of scope | All participants must be registered users with email + password or Google OAuth |
| **Invite flow** | ✅ Link-based | Admin generates a shareable token URL; recipient must register/login first, then accept |
| **Email notifications** | ❌ Out of scope | Can be added post-MVP |
| **Real-time balance push** | ❌ Out of scope | Clients poll the balance endpoint |
| **Recurring expenses** | ❌ Out of scope | Manual entry only |
| **Expense categories/tags** | ❌ Out of scope | Plain description string only |

---

## 5. API Endpoints (MVP)

All routes are prefixed `/api/v1`.

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/signup` | Register a new user (email + password) |
| `POST` | `/auth/login` | Obtain JWT access token |
| `GET` | `/auth/me` | Return current authenticated user |

### Users

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/{user_id}` | Get user profile (public fields) |

### Groups

| Method | Path | Description |
|---|---|---|
| `POST` | `/groups` | Create a group (creator becomes admin) |
| `GET` | `/groups` | List groups the current user belongs to |
| `GET` | `/groups/{group_id}` | Get group details |
| `PATCH` | `/groups/{group_id}` | Update group name / description (admin only) |
| `DELETE` | `/groups/{group_id}` | Delete group (admin only) |
| `GET` | `/groups/{group_id}/members` | List members + roles |
| `DELETE` | `/groups/{group_id}/members/{user_id}` | Remove a member (admin only) |

### Invites

| Method | Path | Description |
|---|---|---|
| `POST` | `/groups/{group_id}/invites` | Generate invite token (admin only) |
| `GET` | `/invites/{token}` | Inspect an invite token (public) |
| `POST` | `/invites/{token}/accept` | Accept invite — adds caller as member |
| `DELETE` | `/invites/{token}` | Revoke invite token (admin only) |

### Expenses

| Method | Path | Description |
|---|---|---|
| `POST` | `/groups/{group_id}/expenses` | Add expense with splits |
| `GET` | `/groups/{group_id}/expenses` | List expenses in a group |
| `GET` | `/groups/{group_id}/expenses/{expense_id}` | Get expense detail + splits |
| `PATCH` | `/groups/{group_id}/expenses/{expense_id}` | Edit expense (payer or admin) |
| `DELETE` | `/groups/{group_id}/expenses/{expense_id}` | Delete expense + splits (payer or admin) |

### Balances

| Method | Path | Description |
|---|---|---|
| `GET` | `/groups/{group_id}/balances` | Computed net balances per member |

### Settlements

| Method | Path | Description |
|---|---|---|
| `POST` | `/groups/{group_id}/settlements` | Record a payment between two members |
| `GET` | `/groups/{group_id}/settlements` | List settlements in a group |

---

## 6. Balance Computation (Overview)

Balances are computed on-the-fly (not stored):

```
net[user] = SUM(expenses where payer = user) - SUM(splits where user_id = user AND !settled)
            + SUM(settlements where payee = user) - SUM(settlements where payer = user)
```

A positive `net` means the user is owed money; negative means they owe money.

---

*This document lives at `docs/DATA_MODEL.md`. Update it as the data model evolves.*
