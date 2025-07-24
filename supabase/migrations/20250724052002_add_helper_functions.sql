-- Helper functions for SwearJar operations

-- Function to update jar balance atomically
CREATE OR REPLACE FUNCTION update_jar_balance(jar_id UUID, amount_change DECIMAL(10,2))
RETURNS void AS $$
BEGIN
    UPDATE swear_jars 
    SET balance = balance + amount_change,
        updated_at = NOW()
    WHERE id = jar_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get jar balance
CREATE OR REPLACE FUNCTION get_jar_balance(jar_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    current_balance DECIMAL(10,2);
BEGIN
    SELECT balance INTO current_balance
    FROM swear_jars 
    WHERE id = jar_id;
    
    RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has permission for jar operation
CREATE OR REPLACE FUNCTION user_has_jar_permission(jar_id UUID, user_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
BEGIN
    -- Check if user is jar owner (owners have all permissions)
    SELECT EXISTS(
        SELECT 1 FROM swear_jars 
        WHERE id = jar_id AND owner_id = user_id
    ) INTO has_permission;
    
    IF has_permission THEN
        RETURN true;
    END IF;
    
    -- Check member permissions
    SELECT COALESCE(
        (permissions->permission_name)::boolean,
        false
    ) INTO has_permission
    FROM swear_jar_members
    WHERE swear_jar_id = jar_id AND user_id = user_id;
    
    RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
