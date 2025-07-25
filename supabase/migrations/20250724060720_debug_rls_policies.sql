-- Debug and fix RLS policies for swear_jars table

-- First, let's see what policies exist (for debugging)
-- This will be logged in the migration output
DO $$
DECLARE
    pol record;
BEGIN
    RAISE NOTICE 'Current policies on swear_jars:';
    FOR pol IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'swear_jars'
    LOOP
        RAISE NOTICE 'Policy: %, Command: %, Qual: %, With_check: %', 
                     pol.policyname, pol.cmd, pol.qual, pol.with_check;
    END LOOP;
END $$;

-- Drop ALL existing policies on swear_jars to start fresh
DROP POLICY IF EXISTS "Users can view accessible jars" ON swear_jars;
DROP POLICY IF EXISTS "Users can view owned jars" ON swear_jars;
DROP POLICY IF EXISTS "Users can view member jars" ON swear_jars;
DROP POLICY IF EXISTS "Users can update owned jars" ON swear_jars;
DROP POLICY IF EXISTS "Users can delete owned jars" ON swear_jars;
DROP POLICY IF EXISTS "Users can create owned jars" ON swear_jars;

-- Create clean, simple policies

-- 1. SELECT policy - users can view jars they have access to
CREATE POLICY "swear_jars_select_policy" ON swear_jars
FOR SELECT USING (
    id IN (SELECT jar_id FROM user_accessible_jar_ids(auth.uid()))
);

-- 2. INSERT policy - users can create jars where they are the owner
CREATE POLICY "swear_jars_insert_policy" ON swear_jars
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
);

-- 3. UPDATE policy - users can update jars they own
CREATE POLICY "swear_jars_update_policy" ON swear_jars
FOR UPDATE USING (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
) WITH CHECK (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
);

-- 4. DELETE policy - users can delete jars they own
CREATE POLICY "swear_jars_delete_policy" ON swear_jars
FOR DELETE USING (
    auth.uid() IS NOT NULL AND owner_id = auth.uid()
);

-- Also ensure RLS is enabled
ALTER TABLE swear_jars ENABLE ROW LEVEL SECURITY;

-- Let's also check the swear_jar_members policies
DO $$
DECLARE
    pol record;
BEGIN
    RAISE NOTICE 'Current policies on swear_jar_members:';
    FOR pol IN 
        SELECT policyname, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'swear_jar_members'
    LOOP
        RAISE NOTICE 'Policy: %, Command: %, Qual: %, With_check: %', 
                     pol.policyname, pol.cmd, pol.qual, pol.with_check;
    END LOOP;
END $$;
