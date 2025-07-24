-- Fix jar access for detail pages and deposits

-- First, add back the ability to view jars you're a member of
-- We'll use a function to avoid direct recursion
CREATE OR REPLACE FUNCTION user_accessible_jar_ids(user_uuid UUID)
RETURNS TABLE(jar_id UUID) 
LANGUAGE SQL SECURITY DEFINER
AS $$
  -- Return jars the user owns or is a member of
  SELECT id FROM swear_jars WHERE owner_id = user_uuid
  UNION
  SELECT swear_jar_id FROM swear_jar_members WHERE user_id = user_uuid;
$$;

-- Drop the previous restrictive policy
DROP POLICY IF EXISTS "Users can view owned jars" ON swear_jars;

-- Create new policies for swear_jars that use the function
CREATE POLICY "Users can view accessible jars" ON swear_jars
FOR SELECT USING (
    id IN (SELECT jar_id FROM user_accessible_jar_ids(auth.uid()))
);

-- Allow users to update jars they own
CREATE POLICY "Users can update owned jars" ON swear_jars
FOR UPDATE USING (owner_id = auth.uid());

-- Allow users to delete jars they own  
CREATE POLICY "Users can delete owned jars" ON swear_jars
FOR DELETE USING (owner_id = auth.uid());

-- Update the swear_jar_members policies to be more permissive for viewing
-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Users can view own memberships" ON swear_jar_members;
DROP POLICY IF EXISTS "Jar owners can view all memberships" ON swear_jar_members;

-- Create new policies that allow viewing members for accessible jars
CREATE POLICY "Users can view memberships for accessible jars" ON swear_jar_members
FOR SELECT USING (
    swear_jar_id IN (SELECT jar_id FROM user_accessible_jar_ids(auth.uid()))
);

-- Keep the management policies as they were
-- (These should already exist from the previous migration)
