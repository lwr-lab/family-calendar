-- Family Calendar Planner - Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Tables

CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'My Family',
    invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(4), 'hex'),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    display_name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#4A90D9',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(family_id, user_id)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_end DATE,
    reminder_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('available', 'not_available', 'maybe', 'pending')),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, member_id)
);

CREATE TABLE blocked_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    label TEXT DEFAULT 'Work',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE major_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL,
    title TEXT NOT NULL,
    updated_by UUID REFERENCES members(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(family_id, year_month)
);

-- 2. Indexes

CREATE INDEX idx_events_family_start ON events(family_id, start_time);
CREATE INDEX idx_members_family ON members(family_id);
CREATE INDEX idx_members_user ON members(user_id);
CREATE INDEX idx_rsvps_event ON rsvps(event_id);
CREATE INDEX idx_blocked_days_family_date ON blocked_days(family_id, start_date, end_date);
CREATE INDEX idx_families_invite_code ON families(invite_code);
CREATE INDEX idx_major_events_family_month ON major_events(family_id, year_month);

-- 3. Row Level Security

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE major_events ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_my_family_ids()
RETURNS SETOF UUID AS $$
  SELECT family_id FROM members WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Families policies
CREATE POLICY "Members can view their families"
    ON families FOR SELECT
    USING (id IN (SELECT get_my_family_ids()));

-- Members policies
CREATE POLICY "Members can view family members"
    ON members FOR SELECT
    USING (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Users can join families"
    ON members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own member record"
    ON members FOR UPDATE
    USING (user_id = auth.uid());

-- Events policies
CREATE POLICY "Members can view family events"
    ON events FOR SELECT
    USING (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Members can create events"
    ON events FOR INSERT
    WITH CHECK (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Members can update own events"
    ON events FOR UPDATE
    USING (created_by IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete own events"
    ON events FOR DELETE
    USING (created_by IN (SELECT id FROM members WHERE user_id = auth.uid()));

-- RSVPs policies
CREATE POLICY "Members can view family rsvps"
    ON rsvps FOR SELECT
    USING (event_id IN (SELECT id FROM events WHERE family_id IN (SELECT get_my_family_ids())));

CREATE POLICY "Members can create rsvps"
    ON rsvps FOR INSERT
    WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update own rsvps"
    ON rsvps FOR UPDATE
    USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

-- Blocked days policies
CREATE POLICY "Members can view family blocked days"
    ON blocked_days FOR SELECT
    USING (family_id IN (SELECT get_my_family_ids()));

CREATE POLICY "Members can create blocked days"
    ON blocked_days FOR INSERT
    WITH CHECK (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Members can update own blocked days"
    ON blocked_days FOR UPDATE
    USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

CREATE POLICY "Members can delete own blocked days"
    ON blocked_days FOR DELETE
    USING (member_id IN (SELECT id FROM members WHERE user_id = auth.uid()));

-- Major events policies
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

-- 4. RPC Functions

CREATE OR REPLACE FUNCTION join_family_by_invite(
    p_invite_code TEXT,
    p_display_name TEXT,
    p_color TEXT
)
RETURNS JSON AS $$
DECLARE
    v_family_id UUID;
    v_member_id UUID;
    v_family_name TEXT;
BEGIN
    SELECT id, name INTO v_family_id, v_family_name
    FROM families
    WHERE invite_code = p_invite_code;

    IF v_family_id IS NULL THEN
        RETURN json_build_object('error', 'Invalid invite code');
    END IF;

    IF EXISTS (SELECT 1 FROM members WHERE family_id = v_family_id AND user_id = auth.uid()) THEN
        RETURN json_build_object('error', 'Already a member of this family');
    END IF;

    INSERT INTO members (family_id, user_id, display_name, color)
    VALUES (v_family_id, auth.uid(), p_display_name, p_color)
    RETURNING id INTO v_member_id;

    RETURN json_build_object(
        'family_id', v_family_id,
        'family_name', v_family_name,
        'member_id', v_member_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_family(
    p_family_name TEXT,
    p_display_name TEXT,
    p_color TEXT
)
RETURNS JSON AS $$
DECLARE
    v_family_id UUID;
    v_invite_code TEXT;
    v_member_id UUID;
BEGIN
    INSERT INTO families (name)
    VALUES (p_family_name)
    RETURNING id, invite_code INTO v_family_id, v_invite_code;

    INSERT INTO members (family_id, user_id, display_name, color)
    VALUES (v_family_id, auth.uid(), p_display_name, p_color)
    RETURNING id INTO v_member_id;

    RETURN json_build_object(
        'family_id', v_family_id,
        'invite_code', v_invite_code,
        'member_id', v_member_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Enable Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE rsvps;
ALTER PUBLICATION supabase_realtime ADD TABLE blocked_days;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
