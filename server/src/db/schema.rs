// @generated automatically by Diesel CLI.

diesel::table! {
    password_history (id) {
        id -> Uuid,
        user_id -> Uuid,
        #[max_length = 255]
        password -> Varchar,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    permissions (id) {
        id -> Uuid,
        #[max_length = 255]
        name -> Varchar,
        description -> Text,
        #[max_length = 255]
        category -> Varchar,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    refresh_tokens (id) {
        id -> Uuid,
        user_id -> Uuid,
        #[max_length = 255]
        token_hash -> Varchar,
        #[max_length = 255]
        device_name -> Nullable<Varchar>,
        #[max_length = 50]
        device_type -> Nullable<Varchar>,
        expires_at -> Timestamptz,
        revoked -> Bool,
        created_at -> Timestamptz,
        family_id -> Uuid,
    }
}

diesel::table! {
    role_permissions (role_id, permission_id) {
        role_id -> Uuid,
        permission_id -> Uuid,
    }
}

diesel::table! {
    roles (id) {
        id -> Uuid,
        #[max_length = 255]
        slug -> Varchar,
        #[max_length = 255]
        name -> Varchar,
        created_at -> Timestamptz,
    }
}

diesel::table! {
    user_credentials (id) {
        id -> Uuid,
        user_id -> Uuid,
        #[max_length = 255]
        password -> Varchar,
        password_changed_at -> Timestamptz,
        is_locked -> Bool,
        locked_until -> Nullable<Timestamptz>,
        failed_login_attempts -> Int4,
        last_failed_login_at -> Nullable<Timestamptz>,
        #[max_length = 64]
        totp_secret -> Nullable<Varchar>,
        totp_enabled -> Bool,
        backup_codes_hashed -> Nullable<Array<Nullable<Text>>>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    user_permissions (user_id, permission_id) {
        user_id -> Uuid,
        permission_id -> Uuid,
        granted -> Bool,
        granted_by -> Nullable<Uuid>,
        granted_at -> Timestamptz,
    }
}

diesel::table! {
    user_profiles (user_id) {
        user_id -> Uuid,
        #[max_length = 255]
        display_name -> Varchar,
        #[max_length = 2048]
        avatar_url -> Nullable<Varchar>,
        bio -> Nullable<Text>,
        #[max_length = 255]
        country -> Nullable<Varchar>,
        date_of_birth -> Nullable<Date>,
        #[max_length = 10]
        language -> Varchar,
        #[max_length = 10]
        theme -> Varchar,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}

diesel::table! {
    user_roles (user_id, role_id) {
        user_id -> Uuid,
        role_id -> Uuid,
        assigned_by -> Nullable<Uuid>,
        assigned_at -> Timestamptz,
    }
}

diesel::table! {
    users (id) {
        id -> Uuid,
        #[max_length = 255]
        username -> Varchar,
        #[max_length = 255]
        email -> Varchar,
        #[max_length = 255]
        role -> Varchar,
        is_active -> Bool,
        is_banned -> Bool,
        banned_until -> Nullable<Timestamptz>,
        #[max_length = 255]
        ban_reason -> Nullable<Varchar>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
        last_login -> Nullable<Timestamptz>,
    }
}

diesel::joinable!(password_history -> users (user_id));
diesel::joinable!(refresh_tokens -> users (user_id));
diesel::joinable!(role_permissions -> permissions (permission_id));
diesel::joinable!(role_permissions -> roles (role_id));
diesel::joinable!(user_credentials -> users (user_id));
diesel::joinable!(user_permissions -> permissions (permission_id));
diesel::joinable!(user_profiles -> users (user_id));
diesel::joinable!(user_roles -> roles (role_id));

diesel::allow_tables_to_appear_in_same_query!(
    password_history,
    permissions,
    refresh_tokens,
    role_permissions,
    roles,
    user_credentials,
    user_permissions,
    user_profiles,
    user_roles,
    users,
);
