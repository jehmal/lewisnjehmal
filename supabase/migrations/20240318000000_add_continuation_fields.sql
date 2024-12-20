-- Add new columns to the conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS thread_id TEXT,
ADD COLUMN IF NOT EXISTS run_id TEXT;

-- Update existing records to have default values
UPDATE conversations
SET
  is_complete = true,
  thread_id = '',
  run_id = ''
WHERE is_complete IS NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_thread_id ON conversations(thread_id);
CREATE INDEX IF NOT EXISTS idx_conversations_run_id ON conversations(run_id); 