-- Tasks System Migration
-- Migration: 015_tasks_system
-- Created: 2025-11-11
-- Description: Create task_lists and tasks tables for Google Tasks integration

-- ============================================================================
-- 1. Task Lists Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  google_account_email TEXT NOT NULL,

  -- Google Tasks API identifiers
  google_tasklist_id TEXT NOT NULL,

  -- Task list properties
  title TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,

  -- Flexible metadata storage
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, google_tasklist_id, google_account_email),

  -- Foreign key to users table
  CONSTRAINT fk_tasklist_user FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

COMMENT ON TABLE task_lists IS 'Google Tasks lists synchronized per user account';
COMMENT ON COLUMN task_lists.google_tasklist_id IS 'Google Tasks API task list identifier';
COMMENT ON COLUMN task_lists.google_account_email IS 'Email address of the Google account this task list belongs to';
COMMENT ON COLUMN task_lists.is_default IS 'Whether this is the user''s default task list';

-- ============================================================================
-- 2. Tasks Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  google_account_email TEXT NOT NULL,

  -- Google Tasks API identifiers
  google_task_id TEXT NOT NULL,
  google_tasklist_id TEXT NOT NULL, -- Which list this task belongs to

  -- Task properties
  title TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'needsAction' CHECK (status IN ('needsAction', 'completed')),
  due_date TIMESTAMP,
  completed_date TIMESTAMP,

  -- Calendar integration (optional link to calendar event)
  calendar_event_id TEXT, -- Store as TEXT array reference (matches email_contacts pattern)

  -- Subtask support
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  "position" TEXT, -- Google's position string for ordering within list/parent

  -- Flexible metadata storage
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  UNIQUE(user_id, google_task_id, google_account_email),

  -- Foreign key to users table
  CONSTRAINT fk_task_user FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

COMMENT ON TABLE tasks IS 'Google Tasks synchronized per user account with calendar integration';
COMMENT ON COLUMN tasks.google_task_id IS 'Google Tasks API task identifier';
COMMENT ON COLUMN tasks.google_tasklist_id IS 'Google Tasks API task list identifier (parent list)';
COMMENT ON COLUMN tasks.status IS 'Task status: needsAction or completed';
COMMENT ON COLUMN tasks.calendar_event_id IS 'Optional link to calendar event ID (for task-event coordination)';
COMMENT ON COLUMN tasks.parent_task_id IS 'Parent task UUID for subtask hierarchies';
COMMENT ON COLUMN tasks."position" IS 'Google Tasks position string for ordering';

-- ============================================================================
-- 3. Indexes for task_lists
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_task_lists_user ON task_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_task_lists_user_default ON task_lists(user_id, is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_task_lists_google_id ON task_lists(google_tasklist_id);
CREATE INDEX IF NOT EXISTS idx_task_lists_account ON task_lists(google_account_email);

-- ============================================================================
-- 4. Indexes for tasks
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_google_id ON tasks(google_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tasklist ON tasks(google_tasklist_id);
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_event ON tasks(calendar_event_id) WHERE calendar_event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_account ON tasks(google_account_email);

-- ============================================================================
-- 5. Triggers for updated_at timestamps
-- ============================================================================
DROP TRIGGER IF EXISTS task_lists_updated_at ON task_lists;
CREATE TRIGGER task_lists_updated_at
  BEFORE UPDATE ON task_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_updated_at();

-- ============================================================================
-- 6. Helper Functions
-- ============================================================================

-- Function to get incomplete tasks with upcoming due dates
CREATE OR REPLACE FUNCTION get_upcoming_tasks(user_id_param TEXT, days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  title TEXT,
  due_date TIMESTAMP,
  google_tasklist_id TEXT,
  parent_task_id UUID,
  calendar_event_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.due_date,
    t.google_tasklist_id,
    t.parent_task_id,
    t.calendar_event_id
  FROM tasks t
  WHERE t.user_id = user_id_param
    AND t.status = 'needsAction'
    AND t.due_date IS NOT NULL
    AND t.due_date BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '1 day' * days_ahead
  ORDER BY t.due_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_upcoming_tasks IS 'Returns incomplete tasks with due dates in the next N days';

-- Function to get subtasks for a parent task
CREATE OR REPLACE FUNCTION get_subtasks(parent_task_id_param UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  status TEXT,
  "position" TEXT,
  due_date TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.status,
    t."position",
    t.due_date
  FROM tasks t
  WHERE t.parent_task_id = parent_task_id_param
  ORDER BY t."position" NULLS LAST, t.created_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_subtasks IS 'Returns all subtasks for a given parent task, ordered by position';

-- Function to mark task as completed
CREATE OR REPLACE FUNCTION complete_task(task_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tasks
  SET status = 'completed',
      completed_date = CURRENT_TIMESTAMP
  WHERE id = task_id_param;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_task IS 'Marks a task as completed with timestamp';

-- ============================================================================
-- 7. Views for Common Queries
-- ============================================================================

-- View: Active tasks with task list names
CREATE OR REPLACE VIEW active_tasks_with_lists AS
SELECT
  t.id,
  t.title,
  t.notes,
  t.status,
  t.due_date,
  t.calendar_event_id,
  t.parent_task_id,
  t.user_id,
  t.google_account_email,
  tl.title as tasklist_title,
  tl.google_tasklist_id,
  t.created_at,
  t.updated_at
FROM tasks t
JOIN task_lists tl ON t.google_tasklist_id = tl.google_tasklist_id AND t.user_id = tl.user_id
WHERE t.status = 'needsAction'
ORDER BY t.due_date NULLS LAST, t.created_at DESC;

COMMENT ON VIEW active_tasks_with_lists IS 'Active (incomplete) tasks with their task list details';

-- View: Overdue tasks
CREATE OR REPLACE VIEW overdue_tasks AS
SELECT
  t.id,
  t.title,
  t.due_date,
  t.user_id,
  t.google_account_email,
  tl.title as tasklist_title,
  EXTRACT(DAY FROM CURRENT_TIMESTAMP - t.due_date)::INTEGER as days_overdue
FROM tasks t
JOIN task_lists tl ON t.google_tasklist_id = tl.google_tasklist_id AND t.user_id = tl.user_id
WHERE t.status = 'needsAction'
  AND t.due_date < CURRENT_TIMESTAMP
ORDER BY t.due_date ASC;

COMMENT ON VIEW overdue_tasks IS 'Incomplete tasks past their due date';

-- ============================================================================
-- Migration Complete
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Tasks System Migration (015_tasks_system) completed successfully';
  RAISE NOTICE 'Created task_lists and tasks tables with Google Tasks API support';
  RAISE NOTICE 'Added calendar event linking, subtask support, and helper functions';
  RAISE NOTICE 'Created views: active_tasks_with_lists, overdue_tasks';
END $$;
