# Admin API (frontend reference)

This folder and the repo root `docs/` directory hold API notes used by the MedLink admin frontend.

## System settings

Singleton platform settings (commission, emergency contact copy, booking instructions).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/settings` | Load current settings |
| `PATCH` | `/admin/settings` | Partial update (all body fields optional) |

Full request/response shapes and examples: **[Admin settings API](../../docs/ADMIN_SETTINGS_API.md)**.

The **Settings** screen in the admin app (`/settings`) calls these endpoints.
