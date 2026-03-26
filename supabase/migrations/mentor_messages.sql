CREATE TABLE IF NOT EXISTS mentor_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE mentor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own messages" ON mentor_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_mentor_messages_project ON mentor_messages(project_id, created_at);
