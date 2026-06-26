# Admin — system settings API

**Base:** `{BASE_URL}/admin`  
**Auth:** `Authorization: Bearer <admin_access_token>`  
**Content-Type:** `application/json`

There is a single settings row (singleton). If the backend has not created it yet, `GET` may initialize it or return defaults—follow your server implementation.

---

## Get settings

**`GET /admin/settings`**

No request body.

### Response `200`

Example JSON body (may be wrapped as `{ "success": true, "data": { ... } }` by a global interceptor):

```json
{
  "id": 1,
  "doctorCommissionPercent": 15,
  "emergencyPhone": "+923001234567",
  "emergencyDescription": "For life-threatening emergencies, call this number immediately.",
  "instructions": "Book appointments at least 2 hours in advance.",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-15T12:30:00.000Z"
}
```

| Field | Type | Notes |
|-------|------|--------|
| `id` | number | Settings record id |
| `doctorCommissionPercent` | number | Platform commission on doctor earnings (e.g. percent) |
| `emergencyPhone` | string | Public emergency line |
| `emergencyDescription` | string | Copy shown with emergency contact |
| `instructions` | string | General instructions for patients / app |
| `createdAt` | string (ISO) | |
| `updatedAt` | string (ISO) | |

---

## Update settings (partial)

**`PATCH /admin/settings`**

Send only fields you want to change. All keys are optional.

### Request body (all optional)

```json
{
  "doctorCommissionPercent": 15,
  "emergencyPhone": "+923001234567",
  "emergencyDescription": "For life-threatening emergencies, call this number immediately.",
  "instructions": "Book appointments at least 2 hours in advance."
}
```

| Field | Type |
|-------|------|
| `doctorCommissionPercent` | number |
| `emergencyPhone` | string |
| `emergencyDescription` | string |
| `instructions` | string |

### Response

Typically `200` with the updated settings object (same shape as `GET`), or your standard success wrapper.

---

## Client note

Use the same `getPayload()` (or equivalent) as other admin routes if responses are nested under `data`.
