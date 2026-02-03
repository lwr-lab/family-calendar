-- Run this in Supabase SQL Editor to add custom recurrence options

-- Add new columns to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER DEFAULT 1;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end DATE;
