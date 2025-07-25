-- Debug authentication and RLS issues

-- Create a function to test current authentication
CREATE OR REPLACE FUNCTION test_auth_state()
RETURNS TABLE(
    current_user_id UUID,
    is_authenticated BOOLEAN
)
LANGUAGE SQL SECURITY DEFINER
AS $$
    SELECT 
        auth.uid() as current_user_id,
        CASE WHEN auth.uid() IS NOT NULL THEN true ELSE false END as is_authenticated;
$$;

-- Temporarily disable RLS to test if the problem is with RLS itself
ALTER TABLE swear_jars DISABLE ROW LEVEL SECURITY;

-- Log current state for debugging
DO $$
BEGIN
    RAISE NOTICE 'RLS disabled temporarily for testing';
    RAISE NOTICE 'Testing authentication state...';
END $$;

-- Create a very permissive policy for testing
-- We'll re-enable RLS with a simple policy to test
ALTER TABLE swear_jars ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "swear_jars_select_policy" ON swear_jars;
DROP POLICY IF EXISTS "swear_jars_insert_policy" ON swear_jars;
DROP POLICY IF EXISTS "swear_jars_update_policy" ON swear_jars;
DROP POLICY IF EXISTS "swear_jars_delete_policy" ON swear_jars;

-- Create a very simple, permissive INSERT policy for testing
CREATE POLICY "test_insert_policy" ON swear_jars
FOR INSERT WITH CHECK (true);  -- Allow all inserts for testing

-- Create a simple SELECT policy
CREATE POLICY "test_select_policy" ON swear_jars
FOR SELECT USING (true);  -- Allow all selects for testing

-- Log the new state
DO $$
BEGIN
    RAISE NOTICE 'Created permissive test policies';
    RAISE NOTICE 'If jar creation still fails, the issue is not with RLS';
END $$;
