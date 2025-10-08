-- Add 'prestadora' role to user_role enum
-- This needs to be in a separate migration from the functions that use it
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'prestadora';