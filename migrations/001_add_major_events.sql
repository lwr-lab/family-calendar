-- Run this in Supabase SQL Editor to add major events feature

-- 1. Create table
CREATE TABLE major_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL,
    title TEXT NOT NULL,
    updated_by UUID REFERENCES members(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(family_id, year_month)
);

-- 2. Add index
CREATE INDEX idx_major_events_family_month ON major_events(family_id, year_month);

-- 3. Enable RLS
ALTER TABLE major_events ENABLE ROW LEVEL SECURITY;

-- 4. Add policies
CREATE POLICY "Members can view family major events"
    ON major_events FOR SELECT
    USING (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Members can create major events"
    ON major_events FOR INSERT
    WITH CHECK (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Members can update family major events"
    ON major_events FOR UPDATE
    USING (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Members can delete family major events"
    ON major_events FOR DELETE
    USING (family_id IN (SELECT get_my_family_ids()));
