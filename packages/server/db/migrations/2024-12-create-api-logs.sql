-- Create API logs table for tracking all API calls
CREATE TABLE IF NOT EXISTS public.api_logs (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    method character varying(10) NOT NULL,
    url text NOT NULL,
    route_name character varying(255),
    request_body jsonb,
    request_params jsonb,
    response_body jsonb,
    response_status integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms integer,
    ip_address inet,
    user_agent text
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON public.api_logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_api_logs_method ON public.api_logs USING btree (method);
CREATE INDEX IF NOT EXISTS idx_api_logs_url ON public.api_logs USING gin (to_tsvector('english', url)); 