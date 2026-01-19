-- Add personalization columns to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#C31432',
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS social_facebook text,
ADD COLUMN IF NOT EXISTS social_instagram text,
ADD COLUMN IF NOT EXISTS social_tiktok text;

-- Comment on columns for clarity
COMMENT ON COLUMN profiles.primary_color IS 'Brand primary color (e.g. for text/accents)';
COMMENT ON COLUMN profiles.secondary_color IS 'Brand secondary color (e.g. for gradients/buttons)';
COMMENT ON COLUMN profiles.banner_url IS 'URL of the hero background image';
