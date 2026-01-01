-- Remove updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at ON users;
DROP TRIGGER IF EXISTS set_updated_at ON user_credentials;
DROP TRIGGER IF EXISTS set_updated_at ON user_profiles;
