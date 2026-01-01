-- Add updated_at triggers for tables that have the column
SELECT diesel_manage_updated_at('users');
SELECT diesel_manage_updated_at('user_credentials');
SELECT diesel_manage_updated_at('user_profiles');
