CREATE TABLE habits (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('good', 'bad')),
  color TEXT NOT NULL,
  button_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE completions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  habit_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ
);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own completions" ON completions
  FOR ALL USING (auth.uid() = user_id);