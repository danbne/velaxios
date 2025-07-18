-- Create grid layouts table
CREATE TABLE IF NOT EXISTS public.grid_layouts (
    layout_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    grid_id character varying(50) NOT NULL,
    layout_name character varying(100) NOT NULL,
    layout_data jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create primary key
ALTER TABLE ONLY public.grid_layouts ADD CONSTRAINT grid_layouts_pkey PRIMARY KEY (layout_id);

-- Create unique constraints
ALTER TABLE ONLY public.grid_layouts ADD CONSTRAINT grid_layouts_user_grid_name_unique UNIQUE (user_id, grid_id, layout_name);
-- CREATE UNIQUE INDEX for default layout per user/grid
CREATE UNIQUE INDEX grid_layouts_user_grid_default_unique
ON public.grid_layouts (user_id, grid_id)
WHERE is_default = true;

-- Create foreign key constraints
ALTER TABLE ONLY public.grid_layouts ADD CONSTRAINT grid_layouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_grid_layouts_user_grid ON public.grid_layouts USING btree (user_id, grid_id);
CREATE INDEX IF NOT EXISTS idx_grid_layouts_default ON public.grid_layouts USING btree (user_id, grid_id, is_default) WHERE (is_default = true);

-- Add comments
COMMENT ON TABLE public.grid_layouts IS 'Stores user-specific grid layouts';
COMMENT ON COLUMN public.grid_layouts.layout_id IS 'Unique identifier for the layout';
COMMENT ON COLUMN public.grid_layouts.user_id IS 'User who owns this layout';
COMMENT ON COLUMN public.grid_layouts.grid_id IS 'Grid identifier this layout belongs to';
COMMENT ON COLUMN public.grid_layouts.layout_name IS 'Name of the layout';
COMMENT ON COLUMN public.grid_layouts.layout_data IS 'JSON data containing the grid state';
COMMENT ON COLUMN public.grid_layouts.is_default IS 'Whether this is the default layout for the user/grid'; 