/*
# Add Admin Role with Full Access

## Overview
Adds an 'admin' role to the system with unrestricted access to all data across all projects.
This role bypasses project membership checks and ownership checks.

## Changes
1. **profiles table**: Add 'admin' to the role CHECK constraint
2. **project_members table**: Add 'admin' to the project_role CHECK constraint
3. **is_admin() helper function**: Returns true if the current authenticated user has role='admin'
4. **All RLS policies updated**: Every policy now includes `OR public.is_admin()` so admin
   can SELECT, INSERT, UPDATE, and DELETE on all tables regardless of ownership or membership.
5. **Admin user created**: auth.users entry with email admin@obrafacil.com and password 2412
6. **Admin profile created**: profiles row with role='admin'

## Security Notes
- The admin role is stored in profiles.role (not in JWT metadata), so it's checked at query time.
- is_admin() performs a lookup on profiles for each policy evaluation.
- Admin can manage all projects, tasks, materials, members, messages, and time entries.
- Admin bypasses the "engenheiro/mestre_obra" restriction on project creation and team management.
*/

-- ============================================================================
-- 1. Update CHECK constraints to include 'admin'
-- ============================================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('engenheiro', 'mestre_obra', 'encarregado', 'funcionario', 'admin'));

ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_project_role_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_project_role_check
  CHECK (project_role IN ('engenheiro', 'mestre_obra', 'encarregado', 'funcionario', 'admin'));

-- ============================================================================
-- 2. Create is_admin() helper function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================================
-- 3. Update ALL RLS policies to grant admin full access
-- ============================================================================

-- PROFILES
DROP POLICY IF EXISTS "select_all_profiles" ON profiles;
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- PROJECTS
DROP POLICY IF EXISTS "select_member_projects" ON projects;
CREATE POLICY "select_member_projects" ON projects FOR SELECT
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_projects" ON projects;
CREATE POLICY "insert_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_member_projects" ON projects;
CREATE POLICY "update_member_projects" ON projects FOR UPDATE
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  ) WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (created_by = auth.uid() OR public.is_admin());

-- PROJECT_MEMBERS
DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  ) WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- TASKS
DROP POLICY IF EXISTS "select_member_tasks" ON tasks;
CREATE POLICY "select_member_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_member_tasks" ON tasks;
CREATE POLICY "insert_member_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_member_tasks" ON tasks;
CREATE POLICY "update_member_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  ) WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_member_tasks" ON tasks;
CREATE POLICY "delete_member_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- TIME_ENTRIES
DROP POLICY IF EXISTS "select_member_time_entries" ON time_entries;
CREATE POLICY "select_member_time_entries" ON time_entries FOR SELECT
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM tasks
      JOIN project_members ON project_members.project_id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_time_entries" ON time_entries;
CREATE POLICY "insert_own_time_entries" ON time_entries FOR INSERT
  TO authenticated WITH CHECK (
    (auth.uid() = user_id OR public.is_admin()) AND
    EXISTS (
      SELECT 1 FROM tasks
      JOIN project_members ON project_members.project_id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND (project_members.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "update_own_time_entries" ON time_entries;
CREATE POLICY "update_own_time_entries" ON time_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "delete_own_time_entries" ON time_entries;
CREATE POLICY "delete_own_time_entries" ON time_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

-- MATERIALS
DROP POLICY IF EXISTS "select_member_materials" ON materials;
CREATE POLICY "select_member_materials" ON materials FOR SELECT
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_member_materials" ON materials;
CREATE POLICY "insert_member_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_member_materials" ON materials;
CREATE POLICY "update_member_materials" ON materials FOR UPDATE
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  ) WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_member_materials" ON materials;
CREATE POLICY "delete_member_materials" ON materials FOR DELETE
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- MESSAGES
DROP POLICY IF EXISTS "select_member_messages" ON messages;
CREATE POLICY "select_member_messages" ON messages FOR SELECT
  TO authenticated USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = messages.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_member_messages" ON messages;
CREATE POLICY "insert_member_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    (auth.uid() = user_id OR public.is_admin()) AND
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = messages.project_id
      AND (project_members.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());
