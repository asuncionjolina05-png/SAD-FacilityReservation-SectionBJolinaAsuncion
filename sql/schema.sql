CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'requester'
        CHECK (role IN ('administrator', 'facility_staff', 'requester')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facilities (
    id BIGSERIAL PRIMARY KEY,
    facility_name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER,
    description TEXT,
    status TEXT DEFAULT 'Active'
        CHECK (status IN ('Active', 'Maintenance', 'Inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
    id BIGSERIAL PRIMARY KEY,
    facility_id BIGINT REFERENCES facilities(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES auth.users(id),
    purpose TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status TEXT DEFAULT 'Pending',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reservations
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE reservations
ADD CONSTRAINT reservations_status_check
CHECK (
    status IN (
        'Pending',
        'Approved',
        'Rejected',
        'Scheduled',
        'In Use',
        'Completed',
        'Cancelled'
    )
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT,
    record_id BIGINT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_audit(
    p_action TEXT,
    p_table_name TEXT,
    p_record_id BIGINT,
    p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, action, table_name, record_id, description
    )
    VALUES (
        auth.uid(), p_action, p_table_name, p_record_id, p_description
    );
END;
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: a user can read their own profile; admins can read all.
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING ( id = auth.uid() );

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
);

-- Facilities: any authenticated user can view.
DROP POLICY IF EXISTS "Authenticated users can view facilities" ON facilities;
CREATE POLICY "Authenticated users can view facilities"
ON facilities FOR SELECT
TO authenticated
USING (true);

-- Facilities: only admins can insert/update/delete (enforced again on the frontend).
DROP POLICY IF EXISTS "Admins manage facilities" ON facilities;
CREATE POLICY "Admins manage facilities"
ON facilities FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
);

-- Reservations: any authenticated user can view (needed for conflict checks + staff/admin views).
DROP POLICY IF EXISTS "Authenticated users can view reservations" ON reservations;
CREATE POLICY "Authenticated users can view reservations"
ON reservations FOR SELECT
TO authenticated
USING (true);

-- Reservations: a requester can insert their own reservation.
DROP POLICY IF EXISTS "Requesters can insert own reservation" ON reservations;
CREATE POLICY "Requesters can insert own reservation"
ON reservations FOR INSERT
TO authenticated
WITH CHECK ( requester_id = auth.uid() );

-- Reservations: requester can update own Pending row; staff/admin can update any (frontend restricts further).
DROP POLICY IF EXISTS "Requesters update own pending reservation" ON reservations;
CREATE POLICY "Requesters update own pending reservation"
ON reservations FOR UPDATE
TO authenticated
USING ( requester_id = auth.uid() )
WITH CHECK ( requester_id = auth.uid() );

DROP POLICY IF EXISTS "Staff and admins update reservations" ON reservations;
CREATE POLICY "Staff and admins update reservations"
ON reservations FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('administrator', 'facility_staff')
    )
);

-- Audit logs: any authenticated user can insert (frontend logs their own actions).
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit logs"
ON audit_logs FOR INSERT
TO authenticated
WITH CHECK ( user_id = auth.uid() );

-- Audit logs: only admins can read them.
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role = 'administrator'
    )
);

INSERT INTO profiles (id, full_name, email, role)
VALUES
('ce44eb70-0310-422a-8b13-b797d2c207bc', 'System Administrator', 'admin@gmail.com', 'administrator'),
('2041030e-c7ee-499f-8aac-fa66705a88c5', 'Facility Staff', 'staff@gmail.com', 'facility_staff'),
('8f4d132d-b242-4497-9a6f-a7444f0cc859', 'Student Requester', 'requester@gmail.com', 'requester');
