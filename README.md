# Laboratory 4 — Section B
### Role-Based Facility Reservation and Approval System

Built with plain HTML/CSS/JS + [Supabase](https://supabase.com) + GitHub Pages, following the lab's three-role model:

| Role | Main functions |
|---|---|
| **Administrator** | Manage users and facilities, approve/reject reservations, view audit logs |
| **Facility Staff** | View reservations, mark In Use, complete reservations, update facility condition |
| **Requester** | View facilities, submit reservations, view own requests, cancel eligible requests |

---

## 1. Project structure

```
facility-reservation-system/
│
├── index.html              # entry point — routes to login or the right dashboard
├── login.html
├── admin-dashboard.html
├── staff-dashboard.html
├── requester-dashboard.html
├── facilities.html         # shared: browse (all roles) + add/edit/delete (admin only)
├── reservations.html       # shared: submit/track (requester), approve/reject (admin),
│                            #         In Use/Complete (staff)
├── audit-logs.html         # administrator only
│
├── css/
│   └── style.css
│
├── js/
│   ├── supabase.js         # <-- put your project URL + anon key here
│   ├── auth.js              # profile lookup, login/role guards, redirects
│   ├── audit.js             # logAudit() helper used everywhere
│   ├── facilities.js        # facility CRUD + status badges
│   ├── reservations.js      # submit/approve/reject/in-use/complete/edit/cancel
│   └── dashboard.js         # stat-tile counts per role
│
├── sql/
│   └── schema.sql           # full Supabase setup script (tables, constraints, RLS)
│
└── README.md
```

## 2. Set up Supabase

1. Create (or open) your Supabase project.
2. **SQL Editor → New Query** → paste and run `sql/schema.sql`. It's written with
   `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` guards, so it's safe to run even if
   you already have `facilities` / `reservations` tables from an earlier lab.
3. **Authentication → Users → Add User** — create three test accounts, e.g.
   `admin@gmail.com`, `staff@gmail.com`, `requester@gmail.com`.
4. Copy each user's UUID from the Authentication table, then insert their profile
   rows (uncomment and fill in the block near the top of `schema.sql`, or run it
   directly in the SQL Editor):

   ```sql
   INSERT INTO profiles (id, full_name, email, role) VALUES
   ('PASTE-ADMIN-UUID-HERE', 'System Administrator', 'admin@gmail.com', 'administrator'),
   ('PASTE-STAFF-UUID-HERE', 'Facility Staff', 'staff@gmail.com', 'facility_staff'),
   ('PASTE-REQUESTER-UUID-HERE', 'Student Requester', 'requester@gmail.com', 'requester');
   ```
5. **Project Settings → API** — copy your Project URL and anon public key into
   `js/supabase.js`:

   ```js
   const SUPABASE_URL = "https://badeaemeqyfvuvzthhfi.supabase.co";
   const SUPABASE_ANON_KEY = "sb_publishable_R7fInzurYQ8tVJWrknlyaw_UoBIXGqY"";
   ```
6. Optional: seed a couple of facilities using the commented `INSERT` at the
   bottom of `schema.sql`, or just add them from the Administrator → Facilities
   page once you're logged in.

## 3. Run it locally

Any static file server works, e.g.:

```bash
npx serve .
```

Then open `index.html` (or wherever it's served) in the browser.

## 4. Deploy to GitHub Pages

```bash
git add .
git commit -m "Implement role-based reservation approval and audit logging"
git push
```

Then: **GitHub repo → Settings → Pages → Source: Deploy from a branch → Branch: main → Folder: /root → Save.**

Your live URL will look like `https://github.com/asuncionjolina05-png/SAD-FacilityReservation-SectionBJolina`.

---

## 5. Business rules implemented

| Rule | Where |
|---|---|
| BR-B4-01 / 08 — only `Active` facilities can be reserved | `reservations.js: submitReservation()` |
| BR-B4-02 — start time must precede end time | `reservations.js: submitReservation()` |
| BR-B4-03 — no overlapping Approved/Scheduled/In Use bookings | `reservations.js: submitReservation()` |
| BR-B4-04 — only Administrator approves/rejects | `reservations.js: approveReservation()`, `rejectReservation()` |
| BR-B4-05 — only Facility Staff marks In Use / Completed | `reservations.js: markInUse()`, `completeReservation()` |
| BR-B4-07 — Completed reservations can't be edited further | enforced by the `.eq("status", "In Use")` guard before completing, and no edit UI is shown for Completed rows |
| BR-B4-09 — requester can edit/cancel only their own Pending (edit) or Pending/Approved (cancel) requests | `reservations.js: updateOwnReservation()`, `cancelReservation()` |

Every state-changing action also writes a row to `audit_logs` via `audit.js: logAudit()`.

## 6. Test cases to run before submission

| Test ID | Scenario | Expected result |
|---|---|---|
| TC-B4-01 | Requester submits reservation | Saved as Pending |
| TC-B4-02 | Submit overlapping schedule | Conflict detected and blocked |
| TC-B4-03 | Administrator approves request | Approved |
| TC-B4-04 | Administrator rejects request | Rejected |
| TC-B4-05 | Staff marks facility In Use | Status updated |
| TC-B4-06 | Staff completes reservation | Completed |
| TC-B4-07 | Requester edits another user's request | Blocked |
| TC-B4-08 | Reserve facility under Maintenance | Blocked |
| TC-B4-09 | Check audit log | Approval/status entries visible |
| TC-B4-10 | Open a protected page without logging in | Redirected to login |

## 7. ERD (summary)

```
auth.users
    │
    └── profiles (id, full_name, email, role, is_active)
              │
              ├── reservations (facility_id FK, requester_id FK, purpose,
              │                 start_time, end_time, status,
              │                 approved_by, approved_at)
              │        │
              │        └── facilities (facility_name, location, capacity, status)
              │
              └── audit_logs (user_id FK, action, table_name, record_id, description)
```

## 8. Role-permission matrix

| Function | Administrator | Facility Staff | Requester |
|---|:---:|:---:|:---:|
| Login | ✓ | ✓ | ✓ |
| View facilities | ✓ | ✓ | ✓ |
| Manage facilities | ✓ | ✗ | ✗ |
| Submit reservation | ✗ | ✗ | ✓ |
| View all reservations | ✓ | ✓ | ✗ |
| View own reservations | ✓ | ✗ | ✓ |
| Approve / reject | ✓ | ✗ | ✗ |
| Mark In Use / Complete | ✗ | ✓ | ✗ |
| Cancel own eligible request | ✗ | ✗ | ✓ |
| View audit logs | ✓ | ✗ | ✗ |

## 9. Reservation workflow

```
Requester submits → Pending → Administrator reviews
                                   ↓            ↓
                               Approved      Rejected
                                   ↓
                               In Use  (staff)
                                   ↓
                               Completed  (staff)

Cancellation: Pending or Approved → Cancelled (requester)
```
