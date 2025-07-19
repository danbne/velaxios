-- Security updates migration
-- Add api_key_hash column and remove plain api_key storage

-- Add api_key_hash column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS api_key_hash character varying(255);

-- Create index on api_key_hash for performance
CREATE INDEX IF NOT EXISTS idx_users_api_key_hash ON public.users USING btree (api_key_hash) WHERE (api_key_hash IS NOT NULL);

-- Add session tracking table for better session management
CREATE TABLE IF NOT EXISTS public.user_sessions (
    session_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone NOT NULL,
    is_revoked boolean DEFAULT false,
    ip_address inet,
    user_agent text,
    CONSTRAINT pk_user_sessions PRIMARY KEY (session_id),
    CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- Create indexes for session management
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON public.user_sessions USING btree (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked ON public.user_sessions USING btree (is_revoked);

-- Add audit logging table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    resource_type character varying(50),
    resource_id uuid,
    ip_address inet,
    user_agent text,
    request_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_audit_logs PRIMARY KEY (log_id),
    CONSTRAINT fk_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs USING btree (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs USING btree (resource_type, resource_id);

-- Add rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address inet NOT NULL,
    endpoint character varying(100) NOT NULL,
    request_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_rate_limits PRIMARY KEY (id),
    CONSTRAINT uk_rate_limits_ip_endpoint UNIQUE (ip_address, endpoint)
);

-- Create indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON public.rate_limits USING btree (ip_address, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits USING btree (window_start);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP 
    OR is_revoked = true;
END;
$$;

-- Function to clean up old audit logs (keep last 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$;

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.rate_limits 
    WHERE window_start < CURRENT_TIMESTAMP - INTERVAL '1 hour';
END;
$$;

-- Create a scheduled job to clean up expired data (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-sessions', '0 2 * * *', 'SELECT public.cleanup_expired_sessions();');
-- SELECT cron.schedule('cleanup-old-audit-logs', '0 3 * * *', 'SELECT public.cleanup_old_audit_logs();');
-- SELECT cron.schedule('cleanup-old-rate-limits', '*/15 * * * *', 'SELECT public.cleanup_old_rate_limits();');

-- Add security-related columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_changed_at timestamp with time zone;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_password_reset timestamp with time zone;

-- Create function to handle failed login attempts
CREATE OR REPLACE FUNCTION public.handle_failed_login(user_email text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users 
    SET 
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE 
            WHEN failed_login_attempts >= 4 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
            ELSE locked_until
        END
    WHERE email = user_email;
END;
$$;

-- Create function to reset failed login attempts
CREATE OR REPLACE FUNCTION public.reset_failed_login_attempts(user_email text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.users 
    SET 
        failed_login_attempts = 0,
        locked_until = NULL
    WHERE email = user_email;
END;
$$; 