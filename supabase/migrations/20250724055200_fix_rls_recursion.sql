-- Fix infinite recursion in swear_jar_members RLS policies

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view swear jar members for jars they belong to" ON swear_jar_members;

-- Drop other potentially problematic policies
DROP POLICY IF EXISTS "Jar owners can manage members" ON swear_jar_members;
DROP POLICY IF EXISTS "Users can leave jars they're members of" ON swear_jar_members;

-- Create simpler, non-recursive policies

-- Allow users to see their own membership records
CREATE POLICY "Users can view own memberships" ON swear_jar_members
FOR SELECT USING (user_id = auth.uid());

-- Allow users to see memberships for jars they own (check via swear_jars table)
CREATE POLICY "Jar owners can view all memberships" ON swear_jar_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM swear_jars 
        WHERE swear_jars.id = swear_jar_members.swear_jar_id 
        AND swear_jars.owner_id = auth.uid()
    )
);

-- Allow jar owners to insert/update/delete memberships
CREATE POLICY "Jar owners can manage memberships" ON swear_jar_members
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM swear_jars 
        WHERE swear_jars.id = swear_jar_members.swear_jar_id 
        AND swear_jars.owner_id = auth.uid()
    )
);

-- Allow users to delete their own memberships (leave jars)
CREATE POLICY "Users can leave jars" ON swear_jar_members
FOR DELETE USING (user_id = auth.uid());

-- Allow users to insert their own memberships (join public jars)
CREATE POLICY "Users can join jars" ON swear_jar_members
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Simplify swear_jars policies to avoid recursion
-- Drop the potentially problematic policy
DROP POLICY IF EXISTS "Users can view swear jars they're members of" ON swear_jars;

-- Create simple, non-recursive policies for swear_jars
-- Users can view jars they own
CREATE POLICY "Users can view owned jars" ON swear_jars
FOR SELECT USING (owner_id = auth.uid());

-- Note: Access to member jars will be handled by Edge Functions using service role
-- This avoids circular dependencies between swear_jars and swear_jar_members tables
