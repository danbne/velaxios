-- Initial database schema migration
-- Based on db.sql structure

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Create functions
CREATE OR REPLACE FUNCTION public.check_wbs_unique_no() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM wbs 
        WHERE parent_wbs_id IS NOT DISTINCT FROM NEW.parent_wbs_id 
        AND wbs_no = NEW.wbs_no 
        AND wbs_id != NEW.wbs_id
    ) THEN
        RAISE EXCEPTION 'WBS number "%" already exists for this parent WBS. Please choose a unique WBS number.', NEW.wbs_no;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_key_type_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.value_type != NEW.value_type AND EXISTS (
        SELECT 1 FROM asset_key_value akv WHERE akv.key_id = OLD.key_id
    ) THEN
        RAISE EXCEPTION 'Cannot change value_type of key % as it is already used in asset_key_value', OLD.key_name;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wbs_has_children() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update has_children to TRUE for WBS entries that are parents
    UPDATE wbs
    SET has_children = TRUE
    WHERE wbs_id IN (SELECT parent_wbs_id FROM wbs WHERE parent_wbs_id IS NOT NULL);

    -- Set has_children to FALSE for WBS entries with no children
    UPDATE wbs
    SET has_children = FALSE
    WHERE wbs_id NOT IN (SELECT parent_wbs_id FROM wbs WHERE parent_wbs_id IS NOT NULL);

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wbs_hierarchy() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update wbs_hierarchy for the affected row and its descendants
    WITH RECURSIVE wbs_tree AS (
        -- Start with the inserted/updated row
        SELECT wbs_id, parent_wbs_id, wbs_no, ARRAY[wbs_no] AS path
        FROM wbs
        WHERE wbs_id = NEW.wbs_id
        UNION ALL
        -- Recursively get ancestors
        SELECT w.wbs_id, w.parent_wbs_id, w.wbs_no, array_prepend(w.wbs_no, t.path)
        FROM wbs w
        JOIN wbs_tree t ON w.wbs_id = t.parent_wbs_id
    ),
    hierarchy AS (
        -- Build the dot-separated hierarchy string for the inserted/updated row
        SELECT wbs_id, array_to_string(path, '.') AS hierarchy_path
        FROM wbs_tree
        WHERE parent_wbs_id IS NULL OR wbs_id = NEW.wbs_id
        UNION
        -- Include descendants of the updated row
        SELECT w.wbs_id, (
            SELECT array_to_string(
                ARRAY(
                    SELECT w2.wbs_no
                    FROM wbs w2
                    WHERE w2.wbs_id = ANY(
                        ARRAY(
                            SELECT w3.wbs_id
                            FROM wbs w3
                            WHERE w3.wbs_id = w.wbs_id
                            OR w3.wbs_id = ANY(
                                SELECT parent_wbs_id
                                FROM wbs w4
                                WHERE w4.wbs_id = w.wbs_id
                                OR w4.wbs_id = ANY(
                                    WITH RECURSIVE desc_tree AS (
                                        SELECT wbs_id, parent_wbs_id
                                        FROM wbs
                                        WHERE wbs_id = w.wbs_id
                                        UNION
                                        SELECT w5.wbs_id, w5.parent_wbs_id
                                        FROM wbs w5
                                        JOIN desc_tree dt ON dt.wbs_id = w5.parent_wbs_id
                                    )
                                    SELECT wbs_id FROM desc_tree
                                )
                            )
                        )
                    )
                    ORDER BY (SELECT created_at FROM wbs w6 WHERE w6.wbs_id = w2.wbs_id)
                ), '.'
            )
        ) AS hierarchy_path
        FROM wbs w
        WHERE w.parent_wbs_id = NEW.wbs_id
        OR w.parent_wbs_id = ANY(
            WITH RECURSIVE desc_tree AS (
                SELECT wbs_id, parent_wbs_id
                FROM wbs
                WHERE wbs_id = NEW.wbs_id
                UNION
                SELECT w2.wbs_id, w2.parent_wbs_id
                FROM wbs w2
                JOIN desc_tree dt ON dt.wbs_id = w2.parent_wbs_id
            )
            SELECT wbs_id FROM desc_tree
        )
    )
    UPDATE wbs
    SET wbs_hierarchy = hierarchy.hierarchy_path
    FROM hierarchy
    WHERE wbs.wbs_id = hierarchy.wbs_id;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_asset_category() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    is_leaf_asset BOOLEAN;
BEGIN
    -- Check if asset is a leaf
    SELECT is_leaf INTO is_leaf_asset
    FROM asset
    WHERE asset_id = NEW.asset_id;

    IF NOT is_leaf_asset THEN
        RAISE EXCEPTION 'Categories can only be added to leaf assets';
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_asset_key_value() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    is_leaf_asset BOOLEAN;
    key_value_type VARCHAR(10);
BEGIN
    -- Check if asset is a leaf
    SELECT is_leaf INTO is_leaf_asset
    FROM asset
    WHERE asset_id = NEW.asset_id;

    IF NOT is_leaf_asset THEN
        RAISE EXCEPTION 'Key-value pairs can only be added to leaf assets';
    END IF;

    -- Get the key's value_type
    SELECT value_type INTO key_value_type
    FROM key
    WHERE key_id = NEW.key_id;

    -- Check if the provided value matches the key's type
    IF NEW.value_text IS NOT NULL AND key_value_type != 'TEXT' THEN
        RAISE EXCEPTION 'Value type mismatch: expected % but provided TEXT', key_value_type;
    ELSIF NEW.value_number IS NOT NULL AND key_value_type != 'NUMBER' THEN
        RAISE EXCEPTION 'Value type mismatch: expected % but provided NUMBER', key_value_type;
    ELSIF NEW.value_date IS NOT NULL AND key_value_type != 'DATE' THEN
        RAISE EXCEPTION 'Value type mismatch: expected % but provided DATE', key_value_type;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_asset_level() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.asset_parent_id IS NULL THEN
        NEW.level := 1;
    ELSE
        SELECT level + 1 INTO NEW.level
        FROM asset
        WHERE asset_id = NEW.asset_parent_id
        AND project_id = NEW.project_id;
        
        IF NEW.level IS NULL THEN
            RAISE EXCEPTION 'Invalid parent_id: Parent does not exist or is from a different project';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Create tables
CREATE TABLE IF NOT EXISTS public.users (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    microsoft_id character varying(255),
    full_name character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp with time zone,
    api_key character varying(255)
);

CREATE TABLE IF NOT EXISTS public.project (
    project_id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_number character varying(50) NOT NULL,
    project_name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.asset (
    asset_id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    asset_number character varying(50) NOT NULL,
    asset_name character varying(255) NOT NULL,
    asset_parent_id uuid,
    level integer NOT NULL,
    is_leaf boolean DEFAULT false NOT NULL,
    asset_description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    CONSTRAINT check_leaf_description CHECK ((is_leaf OR (asset_description IS NULL)))
);

CREATE TABLE IF NOT EXISTS public.asset_category (
    asset_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.asset_key_value (
    asset_id uuid NOT NULL,
    key_id uuid NOT NULL,
    value_text text,
    value_number numeric,
    value_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    CONSTRAINT single_value_type CHECK ((((((value_text IS NOT NULL))::integer + ((value_number IS NOT NULL))::integer) + ((value_date IS NOT NULL))::integer) = 1))
);

CREATE TABLE IF NOT EXISTS public.asset_photo (
    photo_id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    photo_url character varying(255) NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_name character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.category (
    category_id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    category_name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.key (
    key_id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    key_name character varying(255) NOT NULL,
    value_type character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    CONSTRAINT key_definitions_value_type_check CHECK (((value_type)::text = ANY ((ARRAY['TEXT'::character varying, 'NUMBER'::character varying, 'DATE'::character varying])::text[])))
);

CREATE TABLE IF NOT EXISTS public.wbs (
    wbs_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    parent_wbs_id uuid,
    wbs_no character varying(50) NOT NULL,
    wbs_description text NOT NULL,
    has_children boolean DEFAULT false,
    wbs_hierarchy character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.grid_state (
    grid_state_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    grid_id character varying(50) NOT NULL,
    state jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    state_type character varying(20) DEFAULT 'normal'::character varying
);

-- Create primary keys
ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);
ALTER TABLE ONLY public.project ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);
ALTER TABLE ONLY public.asset ADD CONSTRAINT assets_pkey PRIMARY KEY (asset_id);
ALTER TABLE ONLY public.asset_category ADD CONSTRAINT asset_categories_pkey PRIMARY KEY (asset_id, category_id);
ALTER TABLE ONLY public.asset_key_value ADD CONSTRAINT asset_key_values_pkey PRIMARY KEY (asset_id, key_id);
ALTER TABLE ONLY public.asset_photo ADD CONSTRAINT asset_photos_pkey PRIMARY KEY (photo_id);
ALTER TABLE ONLY public.category ADD CONSTRAINT category_definitions_pkey PRIMARY KEY (category_id);
ALTER TABLE ONLY public.key ADD CONSTRAINT key_definitions_pkey PRIMARY KEY (key_id);
ALTER TABLE ONLY public.wbs ADD CONSTRAINT wbs_pkey PRIMARY KEY (wbs_id);
ALTER TABLE ONLY public.grid_state ADD CONSTRAINT grid_state_pkey PRIMARY KEY (grid_state_id);

-- Create unique constraints
ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_microsoft_id_key UNIQUE (microsoft_id);
ALTER TABLE ONLY public.users ADD CONSTRAINT users_api_key_key UNIQUE (api_key);
ALTER TABLE ONLY public.project ADD CONSTRAINT projects_project_number_key UNIQUE (project_number);
ALTER TABLE ONLY public.asset ADD CONSTRAINT unique_asset_number_per_parent_level UNIQUE (project_id, asset_parent_id, level, asset_number);
ALTER TABLE ONLY public.category ADD CONSTRAINT unique_category_name_per_project UNIQUE (project_id, category_name);
ALTER TABLE ONLY public.key ADD CONSTRAINT unique_key_name_per_project UNIQUE (project_id, key_name);
ALTER TABLE ONLY public.wbs ADD CONSTRAINT unique_wbs_no_per_parent UNIQUE (parent_wbs_id, wbs_no);
ALTER TABLE ONLY public.grid_state ADD CONSTRAINT grid_state_user_grid_type_unique UNIQUE (user_id, grid_id, state_type);

-- Create foreign key constraints
ALTER TABLE ONLY public.project ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.project ADD CONSTRAINT projects_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.asset ADD CONSTRAINT assets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.asset ADD CONSTRAINT assets_asset_parent_id_fkey FOREIGN KEY (asset_parent_id) REFERENCES public.asset(asset_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.asset ADD CONSTRAINT assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.asset ADD CONSTRAINT assets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.asset_category ADD CONSTRAINT asset_categories_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset(asset_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.asset_category ADD CONSTRAINT asset_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(category_id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.asset_category ADD CONSTRAINT asset_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.asset_category ADD CONSTRAINT asset_categories_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.asset_key_value ADD CONSTRAINT asset_key_values_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset(asset_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.asset_key_value ADD CONSTRAINT asset_key_values_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.key(key_id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.asset_key_value ADD CONSTRAINT asset_key_values_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.asset_key_value ADD CONSTRAINT asset_key_values_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.asset_photo ADD CONSTRAINT asset_photos_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset(asset_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.asset_photo ADD CONSTRAINT asset_photos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.asset_photo ADD CONSTRAINT asset_photos_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.category ADD CONSTRAINT category_definitions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.category ADD CONSTRAINT category_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.category ADD CONSTRAINT category_definitions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.key ADD CONSTRAINT key_definitions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.project(project_id) ON DELETE CASCADE;
ALTER TABLE ONLY public.key ADD CONSTRAINT key_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);
ALTER TABLE ONLY public.key ADD CONSTRAINT key_definitions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);

ALTER TABLE ONLY public.wbs ADD CONSTRAINT fk_parent_wbs FOREIGN KEY (parent_wbs_id) REFERENCES public.wbs(wbs_id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON public.users USING btree (microsoft_id);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON public.users USING btree (api_key) WHERE (api_key IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_assets_project_parent_level ON public.asset USING btree (project_id, asset_parent_id, level);

CREATE INDEX IF NOT EXISTS idx_grid_state_user_grid ON public.grid_state USING btree (user_id, grid_id);
CREATE INDEX IF NOT EXISTS idx_grid_state_user_grid_type ON public.grid_state USING btree (user_id, grid_id, state_type);

CREATE UNIQUE INDEX IF NOT EXISTS unique_system_category_name ON public.category USING btree (category_name) WHERE (project_id IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS unique_system_key_name ON public.key USING btree (key_name) WHERE (project_id IS NULL);

-- Create triggers
CREATE TRIGGER trigger_prevent_key_type_change BEFORE UPDATE OF value_type ON public.key FOR EACH ROW EXECUTE FUNCTION public.prevent_key_type_change();
CREATE TRIGGER trigger_validate_asset_category BEFORE INSERT OR UPDATE ON public.asset_category FOR EACH ROW EXECUTE FUNCTION public.validate_asset_category();
CREATE TRIGGER trigger_validate_asset_key_value BEFORE INSERT OR UPDATE ON public.asset_key_value FOR EACH ROW EXECUTE FUNCTION public.validate_asset_key_value();
CREATE TRIGGER trigger_validate_asset_level BEFORE INSERT OR UPDATE OF asset_parent_id, project_id ON public.asset FOR EACH ROW EXECUTE FUNCTION public.validate_asset_level();
CREATE TRIGGER trigger_wbs_check_unique_no BEFORE INSERT OR UPDATE OF wbs_no, parent_wbs_id ON public.wbs FOR EACH ROW EXECUTE FUNCTION public.check_wbs_unique_no();
CREATE TRIGGER trigger_wbs_update_has_children AFTER INSERT OR UPDATE OF parent_wbs_id ON public.wbs FOR EACH STATEMENT EXECUTE FUNCTION public.update_wbs_has_children();
CREATE TRIGGER trigger_wbs_update_hierarchy AFTER INSERT OR UPDATE OF wbs_no, parent_wbs_id ON public.wbs FOR EACH ROW EXECUTE FUNCTION public.update_wbs_hierarchy();

-- Add constraints
ALTER TABLE ONLY public.asset_photo ADD CONSTRAINT one_primary_photo_per_asset EXCLUDE USING btree (asset_id WITH =) WHERE (is_primary);

-- Add comments
COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)'; 