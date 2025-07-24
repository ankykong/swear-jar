-- Fix missing INSERT policy for swear jar creation

-- Allow users to create swear jars where they are the owner
CREATE POLICY "Users can create owned jars" ON swear_jars
FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Also need to allow users to create their own membership record
-- when they create a jar (for the owner membership)
CREATE POLICY "Users can create own memberships" ON swear_jar_members
FOR INSERT WITH CHECK (user_id = auth.uid());
