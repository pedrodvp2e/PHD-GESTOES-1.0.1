/*
# Construction Management App - RLS Policies

## Overview
Adds Row Level Security policies to all tables created in the previous migration.
All policies are scoped to `authenticated` users. Access is based on project membership:
a user can only access data for projects where they are a member in `project_members`.

## Security Model
- profiles: owner-scoped (users manage their own profile), but all authenticated users can read profiles (to see team members)
- projects: visible only to project members; insertable by any authenticated user; updatable by members; deletable by creator
- project_members: visible to members of the same project; insertable/updatable/deletable by existing members
- tasks: visible/insertable/updatable/deletable by project members
- time_entries: visible to project members; insertable/updatable/deletable only by the owner
- materials: visible/insertable/updatable/deletable by project members
- messages: visible to project members; insertable by members (user_id must match auth.uid()); deletable by owner

## Important Notes
1. Each table has 4 separate policies (SELECT, INSERT, UPDATE, DELETE) - no FOR ALL.
2. Ownership checks use auth.uid() - never current_user.
3. Project membership is checked via EXISTS subqueries on project_members.
*/

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "select_all_profiles" ON profiles;
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PROJECTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "select_member_projects" ON projects;
CREATE POLICY "select_member_projects" ON projects FOR SELECT
  TO authenticated USING (
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
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (created_by = auth.uid());

-- ============================================================================
-- PROJECT_MEMBERS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "select_project_members" ON project_members;
CREATE POLICY "select_project_members" ON project_members FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_project_members" ON project_members;
CREATE POLICY "insert_project_members" ON project_members FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_project_members" ON project_members;
CREATE POLICY "update_project_members" ON project_members FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_project_members" ON project_members;
CREATE POLICY "delete_project_members" ON project_members FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "select_member_tasks" ON tasks;
CREATE POLICY "select_member_tasks" ON tasks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_member_tasks" ON tasks;
CREATE POLICY "insert_member_tasks" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_member_tasks" ON tasks;
CREATE POLICY "update_member_tasks" ON tasks FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_member_tasks" ON tasks;
CREATE POLICY "delete_member_tasks" ON tasks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TIME_ENTRIES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "select_member_time_entries" ON time_entries;
CREATE POLICY "select_member_time_entries" ON time_entries FOR SELECT
  TO authenticated USING (
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
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM tasks
      JOIN project_members ON project_members.project_id = tasks.project_id
      WHERE tasks.id = time_entries.task_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_time_entries" ON time_entries;
CREATE POLICY "update_own_time_entries" ON time_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_time_entries" ON time_entries;
CREATE POLICY "delete_own_time_entries" ON time_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- MATERIALS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "select_member_materials" ON materials;
CREATE POLICY "select_member_materials" ON materials FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_member_materials" ON materials;
CREATE POLICY "insert_member_materials" ON materials FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_member_materials" ON materials;
CREATE POLICY "update_member_materials" ON materials FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_member_materials" ON materials;
CREATE POLICY "delete_member_materials" ON materials FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = materials.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "select_member_messages" ON messages;
CREATE POLICY "select_member_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = messages.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_member_messages" ON messages;
CREATE POLICY "insert_member_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = messages.project_id
      AND project_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
