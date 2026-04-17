-- Shift Tracker Tables

-- Employees from route list (CHECKERS/SHOPRITE only)
CREATE TABLE IF NOT EXISTS shift_employees (
  id BIGSERIAL PRIMARY KEY,
  employee_code TEXT NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  store TEXT NOT NULL,
  rep TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  job_title TEXT NOT NULL DEFAULT '',
  employee_status TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_code, store)
);

-- Signed shifts from Addendum B
CREATE TABLE IF NOT EXISTS shift_signed (
  id BIGSERIAL PRIMARY KEY,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  store TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Not Signed',
  submitted_by TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  hours NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_code)
);

-- Upload history
CREATE TABLE IF NOT EXISTS shift_uploads (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'route_list',
  record_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow anon read access
ALTER TABLE shift_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_signed ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_uploads ENABLE ROW LEVEL SECURITY;

-- Allow anon to read all tables
CREATE POLICY "Allow anon read on shift_employees" ON shift_employees FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read on shift_signed" ON shift_signed FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read on shift_uploads" ON shift_uploads FOR SELECT TO anon USING (true);

-- Allow anon to insert (admin uploads will use anon key for now)
CREATE POLICY "Allow anon insert on shift_employees" ON shift_employees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert on shift_signed" ON shift_signed FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert on shift_uploads" ON shift_uploads FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to delete (for re-uploads)
CREATE POLICY "Allow anon delete on shift_employees" ON shift_employees FOR DELETE TO anon USING (true);
CREATE POLICY "Allow anon delete on shift_signed" ON shift_signed FOR DELETE TO anon USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shift_employees_rep ON shift_employees(rep);
CREATE INDEX IF NOT EXISTS idx_shift_employees_store ON shift_employees(store);
CREATE INDEX IF NOT EXISTS idx_shift_employees_code ON shift_employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_shift_signed_code ON shift_signed(employee_code);