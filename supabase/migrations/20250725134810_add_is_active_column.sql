-- Add is_active column for soft deletes

-- Add is_active column to swear_jars table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'swear_jars' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE swear_jars 
        ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;
        
        RAISE NOTICE 'Added is_active column to swear_jars table';
    ELSE
        RAISE NOTICE 'is_active column already exists on swear_jars table';
    END IF;
END $$;

-- Create an index for performance on is_active queries
CREATE INDEX IF NOT EXISTS idx_swear_jars_is_active ON swear_jars(is_active);

-- Update any existing NULL values to true (active)
UPDATE swear_jars SET is_active = true WHERE is_active IS NULL;
