-- Profiles (extends Supabase Auth users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text,
  email text,
  role text CHECK (role IN ('admin', 'dt')) NOT NULL DEFAULT 'dt',
  slack_user_id text,
  created_at timestamptz DEFAULT now()
);

-- Patients
CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  code text,
  assigned_dt_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Message Templates
CREATE TABLE templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  body text NOT NULL,
  type text CHECK (type IN ('counselling', 'followup', 'general')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Workflow Sessions
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  dt_id uuid REFERENCES profiles(id),
  type text CHECK (type IN ('counselling', 'followup')),
  status text CHECK (status IN ('scheduled', 'reminder_sent', 'done', 'cancelled'))
    DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL,
  template_id uuid REFERENCES templates(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Reminders (Slack DMs to fire)
CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  dt_id uuid REFERENCES profiles(id),
  fire_at timestamptz NOT NULL,
  offset_label text,
  status text CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  slack_message_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins can read all
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Patients: DTs see their own, admins see all
CREATE POLICY "DTs can view own patients"
  ON patients FOR SELECT
  USING (assigned_dt_id = auth.uid());

CREATE POLICY "Admins can view all patients"
  ON patients FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "DTs can insert patients assigned to them"
  ON patients FOR INSERT
  WITH CHECK (assigned_dt_id = auth.uid() AND created_by = auth.uid());

CREATE POLICY "Admins can insert patients"
  ON patients FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "DTs can update own patients"
  ON patients FOR UPDATE
  USING (assigned_dt_id = auth.uid());

CREATE POLICY "Admins can update all patients"
  ON patients FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Templates: all authenticated users can read, admins can write
CREATE POLICY "Authenticated users can view templates"
  ON templates FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage templates"
  ON templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sessions: DTs see their own, admins see all
CREATE POLICY "DTs can view own sessions"
  ON sessions FOR SELECT
  USING (dt_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "DTs can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (dt_id = auth.uid());

CREATE POLICY "DTs can update own sessions"
  ON sessions FOR UPDATE
  USING (dt_id = auth.uid());

CREATE POLICY "Admins can manage all sessions"
  ON sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reminders: DTs see their own, admins see all
CREATE POLICY "DTs can view own reminders"
  ON reminders FOR SELECT
  USING (dt_id = auth.uid());

CREATE POLICY "Admins can view all reminders"
  ON reminders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "DTs can insert own reminders"
  ON reminders FOR INSERT
  WITH CHECK (dt_id = auth.uid());

CREATE POLICY "DTs can update own reminders"
  ON reminders FOR UPDATE
  USING (dt_id = auth.uid());

CREATE POLICY "Admins can manage all reminders"
  ON reminders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Auto-create profile on signup trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'dt')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
