# Backend migration plan for the prototype

This note captures what the current application code already expects from the backend, what is already present in the existing Supabase migrations, and what still needs to be added or corrected before you run the prototype reliably.

## 1. What already exists in the repo

The repo already includes base schema migrations for:

- core users, profiles, vessels, departments, sequence counters, workflow history, notifications, and audit logging
- requirements and requirement line items
- vendors, approvals, purchase orders, PO items, and payments
- deliveries and delivery items
- store locations, QC inspections, QC defects, inventory PINs, and inventory transactions
- material issues, recoveries, and genealogy
- AI support tables for chat sessions, chat messages, embeddings, and SOP documents
- reporting views and RPC helpers

## 2. Tables/views the current code path expects

If you want the current UI and server actions to work, your database needs these objects at minimum:

### Core workflow tables
- `profiles`
- `vessels`
- `departments`
- `requirements`
- `requirement_items`
- `approvals`
- `vendors`
- `vendor_contacts`
- `purchase_orders`
- `po_items`
- `payments`
- `deliveries`
- `delivery_items`
- `store_locations`
- `qc_inspections`
- `qc_defects`
- `inventory_pins`
- `inventory_transactions`
- `material_issues`
- `recoveries`
- `workflow_history`
- `audit_log`
- `notifications`
- `seq_counters`

### AI/chatbot tables
- `chat_sessions`
- `chat_messages`
- `embeddings`
- `sop_documents`

### Views/RPCs used by the app
- `v_stock_balance`
- `v_qc_summary`
- `v_recovery_summary`
- `v_material_genealogy`
- `recalculate_pin_quantity`
- `fn_stock_availability`
- `fn_po_status`

## 3. Backend blockers and current status

Before running migrations as-is, there are a few important backend issues to fix.

### A. `po_items` duplication has been reconciled
`po_items` is created in `004_approvals_procurement.sql`, and `005_delivery_receiving.sql` now only extends that table with receiving-specific fields instead of recreating it.

### B. `009_views_rpc.sql` has been aligned with the current schema
The read-model migration was corrected so it uses the actual column names:

- `qi.inspection_date`
- `inventory_transactions.transaction_type`
- `vessels.name` joined from `material_issues.vessel_id`

That means the reporting/views migration should now be safe to run in the prototype branch.

### C. Prototype mode still depends on authenticated-style profile rows
The prototype intentionally avoids sign-in, but several tables still require actor/user foreign keys into `profiles`, and `profiles.id` itself points to `auth.users(id)`. The prototype helper resolves a fallback actor from `profiles`, so the database still needs at least one usable actor row or an alternative prototype-safe operator model.

### D. `010_rls.sql` is intentionally a prototype no-op
The prototype requirements said not to add RLS or auth-gated access for this build, so `010_rls.sql` should remain a no-op placeholder on the prototype branch until an authenticated version is intentionally introduced.

## 4. What I recommend adding next on the backend

I recommend adding **three new migrations** after you repair the existing migration chain.

### Migration 011: `011_prototype_operator_support.sql`
Purpose: remove the hidden dependency on authenticated users for a no-login prototype.

Recommended changes:

- create `prototype_operators`
  - `id uuid primary key default uuid_generate_v4()`
  - `name text not null`
  - `team text`
  - `badge text`
  - `role_hint text`
  - `is_active boolean not null default true`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`
- add nullable `prototype_operator_id` columns to:
  - `audit_log`
  - `workflow_history`
  - `chat_sessions`
  - `chat_messages` if you want full attribution at message level
- seed a few prototype operators such as Stores, QC, Shipbuilder Ops, Procurement

Why: this keeps attribution without introducing real auth, and it matches the localStorage operator modal model better than forcing `profiles` rows backed by `auth.users`.

### Migration 012: `012_prototype_lifecycle_detail.sql`
Purpose: normalize lifecycle events that are currently being stored mainly in `audit_log` JSON.

Recommended new tables:

#### `vendor_return_replacements`
Use this to model the return/replacement loop explicitly instead of only storing it in audit JSON.

Suggested columns:
- `id uuid primary key`
- `delivery_id uuid not null references deliveries(id)`
- `qc_inspection_id uuid references qc_inspections(id)`
- `rejected_quantity numeric(12,3) not null`
- `replacement_required boolean not null default false`
- `status text not null`
- `replacement_delivery_id uuid references deliveries(id)`
- `notes text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### `inventory_intakes`
Use this to store intake decisions structurally.

Suggested columns:
- `id uuid primary key`
- `delivery_id uuid not null references deliveries(id)`
- `qc_inspection_id uuid references qc_inspections(id)`
- `pin_id uuid not null references inventory_pins(id)`
- `accepted_quantity numeric(12,3) not null`
- `rejected_quantity numeric(12,3) not null default 0`
- `category text`
- `phase text`
- `location_id uuid references store_locations(id)`
- `created_by_prototype_operator_id uuid references prototype_operators(id)`
- `created_at timestamptz not null default now()`

#### `issue_usage_outcomes`
The UI captures `not used`, `leftover`, and `scrap`, but today that is largely audit-driven. This table gives you proper backend history.

Suggested columns:
- `id uuid primary key`
- `issue_id uuid not null references material_issues(id)`
- `pin_id uuid not null references inventory_pins(id)`
- `outcome_type text not null check (outcome_type in ('not_used','leftover','scrap'))`
- `quantity numeric(12,3) not null`
- `recovery_location_id uuid references store_locations(id)`
- `notes text`
- `captured_at timestamptz not null default now()`
- `captured_by_prototype_operator_id uuid references prototype_operators(id)`

#### `recovery_assessments`
This separates the assessment decision from the raw recovery row.

Suggested columns:
- `id uuid primary key`
- `recovery_id uuid not null unique references recoveries(id)`
- `reusable boolean not null`
- `decision text not null check (decision in ('reuse','repair','scrap','hold'))`
- `condition_grade text`
- `condition_notes text`
- `disposition_notes text`
- `assessed_by_prototype_operator_id uuid references prototype_operators(id)`
- `assessed_at timestamptz not null default now()`

Why: these tables make reporting, traceability, and later API/report development much easier than mining `audit_log.new_data` JSON forever.

### Migration 013: `013_fix_views_and_prototype_reporting.sql`
Purpose: make the read-model layer consistent with the real table structure.

Recommended work:

- fix `v_qc_summary`
- fix `v_inventory_status`
- fix `v_issue_summary`
- rebuild `v_recovery_summary` if needed
- add a new `v_traceability_timeline` view joining:
  - requirement
  - purchase order
  - delivery
  - QC
  - intake
  - PIN
  - issue
  - usage outcome
  - recovery
  - derived PIN lineage

Why: the prototype UX is heavily traceability-driven, so getting the reporting layer right is just as important as the write tables.

## 5. If you want the minimum viable migration path

If you do not want to redesign much yet, do this in order:

1. Run the schema chain through `010_rls.sql` on the prototype branch.
2. Add a prototype operator table plus nullable attribution references.
3. Add at least one normalized table for usage outcomes.
4. Optionally add normalized tables for vendor returns and inventory intake.

## 6. Seed data you should prepare

Even for prototype use, you should seed:

- 3 to 5 `prototype_operators`
- 3 to 5 `store_locations`
- 2 to 3 `vessels`
- a few `vendors`
- at least one `requirement` → `purchase_order` → `delivery` chain
- one QC pass case
- one QC partial pass case
- one QC fail with replacement loop case
- one issue with leftover/not-used/scrap outcomes
- one reusable recovery that creates a derived PIN

## 7. Recommended commands

With the prototype migration fixes in place, the deployment flow should be roughly:

```bash
supabase db reset
supabase db push
psql "$DATABASE_URL" -f supabase/seed.sql
```

If you want, the next step I can do is generate the actual SQL migration files for:

- prototype operator support
- normalized usage outcomes
- normalized vendor return / replacement tracking
- fixed reporting views
