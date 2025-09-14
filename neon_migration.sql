--
-- PostgreSQL database dump
--

\restrict dB0LqBe7gu15DKQy12iwvYL9HgC0B3yUggWcgoySVRQInDAKKD498eqy2eEg6SX

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: generate_ticket_id(uuid); Type: FUNCTION; Schema: public; Owner: supportai
--

CREATE FUNCTION public.generate_ticket_id(org_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    counter INTEGER;
    ticket_id TEXT;
BEGIN
    -- Get or create counter for this organization
    SELECT COALESCE(MAX(CAST(SUBSTRING(m.ticket_id FROM 2) AS INTEGER)), 0) + 1
    INTO counter
    FROM messages m
    WHERE m.organization_id = org_id;

    -- Format as #000001
    ticket_id := '#' || LPAD(counter::TEXT, 6, '0');

    RETURN ticket_id;
END;
$$;


ALTER FUNCTION public.generate_ticket_id(org_id uuid) OWNER TO supportai;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: supportai
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO supportai;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: supportai
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    message_id uuid,
    activity_type character varying(50) NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_log OWNER TO supportai;

--
-- Name: draft_replies; Type: TABLE; Schema: public; Owner: supportai
--

CREATE TABLE public.draft_replies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message_id uuid NOT NULL,
    draft_content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.draft_replies OWNER TO supportai;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: supportai
--

CREATE TABLE public.messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    ticket_id character varying(20) NOT NULL,
    customer_name text,
    customer_email text,
    subject text,
    message text,
    category character varying(100),
    ai_suggested_response text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    agent_id uuid,
    processed_at timestamp with time zone,
    response_time_ms integer,
    auto_reviewed boolean DEFAULT false,
    is_generating boolean DEFAULT false,
    edit_history jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT messages_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'edited'::character varying, 'sent'::character varying, 'review'::character varying])::text[])))
);


ALTER TABLE public.messages OWNER TO supportai;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: supportai
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.migrations OWNER TO supportai;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: supportai
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO supportai;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: supportai
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: organization_settings; Type: TABLE; Schema: public; Owner: supportai
--

CREATE TABLE public.organization_settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    settings_data text NOT NULL,
    version integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.organization_settings OWNER TO supportai;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: supportai
--

CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    domain character varying(255),
    plan_type character varying(50) DEFAULT 'basic'::character varying NOT NULL,
    plan_status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    plan_started_at timestamp with time zone DEFAULT now() NOT NULL,
    plan_expires_at timestamp with time zone,
    encrypted_data_key text NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT organizations_plan_status_check CHECK (((plan_status)::text = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'cancelled'::character varying, 'trial'::character varying])::text[]))),
    CONSTRAINT organizations_plan_type_check CHECK (((plan_type)::text = ANY ((ARRAY['basic'::character varying, 'pro'::character varying, 'enterprise'::character varying])::text[])))
);


ALTER TABLE public.organizations OWNER TO supportai;

--
-- Name: users; Type: TABLE; Schema: public; Owner: supportai
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'agent'::character varying NOT NULL,
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'agent'::character varying, 'viewer'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO supportai;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: supportai
--

COPY public.activity_log (id, organization_id, user_id, message_id, activity_type, details, created_at) FROM stdin;
838a8938-7f62-40cb-8b0b-d084b648c3d9	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	\N	d3f36819-6b59-4573-9e98-056b231867da	received	{"source": "api"}	2025-09-13 07:40:34.517805+00
da75e765-bf20-49f9-b05f-6e58e3abf243	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	\N	9d486a55-2e0f-4726-aaf5-d3b55442335d	received	{"source": "api"}	2025-09-13 12:08:30.332439+00
36703691-8cb4-4190-8620-59a709ed2659	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	\N	f15444cb-50de-428d-ab54-c1aa4ba0f841	received	{"source": "api"}	2025-09-13 16:05:15.622134+00
58a4dcfa-737a-4824-8541-4d96d3627678	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	\N	3478df39-9688-476c-90dc-f68bb10d8d09	received	{"source": "api"}	2025-09-13 16:05:58.357602+00
\.


--
-- Data for Name: draft_replies; Type: TABLE DATA; Schema: public; Owner: supportai
--

COPY public.draft_replies (id, organization_id, user_id, message_id, draft_content, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: supportai
--

COPY public.messages (id, organization_id, ticket_id, customer_name, customer_email, subject, message, category, ai_suggested_response, status, agent_id, processed_at, response_time_ms, auto_reviewed, is_generating, edit_history, metadata, created_at, updated_at) FROM stdin;
9d486a55-2e0f-4726-aaf5-d3b55442335d	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	#000002	{"encrypted":"T9BnKoeGEWa9DCJ81S3MDg==","iv":"e8255b6cb23031a7f74bd9b679b56217","algorithm":"AES-256-GCM","version":1}	{"encrypted":"PkKX40PDhAqFQPYua8/J8ZMyaNXgDLh5PJ5mBBt1VdU=","iv":"e79be3da601bd1ba297e492089d8c360","algorithm":"AES-256-GCM","version":1}	{"encrypted":"TtDxJm8UJpnB2LKl3BXxyBY8r7G+pMLKU2hZEDR0JPM=","iv":"4fa06fb2a39433e4f6175d0995fdde1e","algorithm":"AES-256-GCM","version":1}	{"encrypted":"B18Hm1k0eEfrJ35LYW3LW1ZkHbtvwJs0ae1bDD9RX4dj6m5FtumRqhZJjXt5XErUf8XJf+LHvuCmNAqY9Gebbw==","iv":"1a992c6013287c9de7e3a357d4bc68d6","algorithm":"AES-256-GCM","version":1}	General Inquiry	{"encrypted":"77WiH8oqfrUUvioKC1fCq/MOcwaJoO8D4OqcdREUCa1cJg5bUwmZVS+BJxR4qmVcHmCTJtu/ZwXLvfTXy3a1kSSqgeU+x89ucFRhwBSQ+DSljyrHwf+ol5T4Idis5MgiJk6G9ikIAjEj/7N49EUN5QehOUpNSX3ufLPktL5nVS8=","iv":"035805b6a9bc0f87b41efdea2a35213f","algorithm":"AES-256-GCM","version":1}	pending	\N	\N	\N	t	f	[]	{}	2025-09-13 12:08:30.327957+00	2025-09-13 14:27:19.910862+00
d3f36819-6b59-4573-9e98-056b231867da	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	#000001	{"encrypted":"V6rLOOj3Z6GFNeEmfkRD/g==","iv":"5408f902c9666ae1de3a4f99ed23082b","algorithm":"AES-256-GCM","version":1}	{"encrypted":"4OijHZljrelWvKhSvi+qcK3ZXCRWHjZczhBPddvHTFw=","iv":"671b692a86bde8fddc8e8581bdb34e8b","algorithm":"AES-256-GCM","version":1}	{"encrypted":"pouLb8nkwV18iOx9RTRbOA==","iv":"c1b535e039a026d57a76eb96795f8bff","algorithm":"AES-256-GCM","version":1}	{"encrypted":"Mu5k4H0T7xWA2LvA8A32R9MmqmC7sJOwf0pHLSSmVUk=","iv":"cf0c6fe81469f381c0f0b2fd809e80b5","algorithm":"AES-256-GCM","version":1}	General Inquiry	{"encrypted":"CqFu8gxroCFK4Z8PV/qOn6RLTf67nmq7C8Zdc/UGwn1jYatHhtfz60VJn5cEkzyAqhiqwr7Q/a6T4n2eXilrP+Lsl8t5yfFrdYnFUMGylW1d/xTUmbOIN7ukWLtx2oOhm5T50OiRNsnFNWCXd+ihvBlXtO7HWdj7gn1uwYdG0ro=","iv":"5c4cc6b50011749c8bd86ccda08a2838","algorithm":"AES-256-GCM","version":1}	pending	\N	\N	\N	t	f	[]	{}	2025-09-13 07:40:34.515136+00	2025-09-13 14:27:20.598601+00
f15444cb-50de-428d-ab54-c1aa4ba0f841	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	#000003	{"encrypted":"Nyh3AKHdyoIrjurR46XP3g==","iv":"db5e236a1a5150440065ef3a5f3b389a","algorithm":"AES-256-GCM","version":1}	{"encrypted":"cGwszT8jMTtoYr2YNmu4FaKYZg+wKpN7Ap9JTBVtfAw=","iv":"753e70134c59c928253879742fbfd3b7","algorithm":"AES-256-GCM","version":1}	{"encrypted":"CwvQ2FfRwJi42awMMqk9KgQnwf62sVTbdvy4cmRVfpQ=","iv":"cc7e57b2120cf379e64050497cdc5e53","algorithm":"AES-256-GCM","version":1}	{"encrypted":"FCNGJVBwA8cXrW+iDWidQ7ESoBOxBMHPEUZxhuSrkA5XrRjObLDf5sIOy+u0rz0iOftbKFJknD9jaHP3NBekhg==","iv":"b0e60938a48bbad71c89e0531de083a0","algorithm":"AES-256-GCM","version":1}	\N	\N	pending	\N	\N	\N	f	f	[]	{}	2025-09-13 16:05:15.619683+00	2025-09-13 16:05:15.619683+00
3478df39-9688-476c-90dc-f68bb10d8d09	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	#000004	{"encrypted":"izp0Hfq0n6JATiPseeNICA==","iv":"297d827f3984280e5cf21ae6bf443ce4","algorithm":"AES-256-GCM","version":1}	{"encrypted":"HrYST+F+kNtmQDqQVbtWJ0EzOnZWsfG6XGVMu61zzLU=","iv":"e2bee895232d3d4f54fe2a4dfe602d5c","algorithm":"AES-256-GCM","version":1}	{"encrypted":"4f/uWB7bvK0V9W4UneNt/qlxr5PqAx5e+z75AYDzWjo=","iv":"4e14ce7d75fdd5b0907e7534f703a5f6","algorithm":"AES-256-GCM","version":1}	{"encrypted":"OUaMzq9K4TghM47HkxXUKLn4Cl1Fwfg+wuBGaCvlAUX8HmJy/ggpn0QB5fjFU5fEMIL4wN+pKuc0xieVJxo92w==","iv":"a493976dbc93617e6a667e797f2351d1","algorithm":"AES-256-GCM","version":1}	\N	\N	pending	\N	\N	\N	f	f	[]	{}	2025-09-13 16:05:58.3555+00	2025-09-13 16:05:58.3555+00
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: supportai
--

COPY public.migrations (id, filename, executed_at) FROM stdin;
1	001-create-initial-schema.sql	2025-09-13 07:35:13.403336+00
\.


--
-- Data for Name: organization_settings; Type: TABLE DATA; Schema: public; Owner: supportai
--

COPY public.organization_settings (id, organization_id, settings_data, version, created_at, updated_at) FROM stdin;
c7106a0d-6075-4dd7-86f2-90024f7b3f0c	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	{"agentName":"Demo Support Agent","agentSignature":"Best regards,\\\\nDemo Support Team","categories":[{"id":"1","name":"Technical Support","color":"#ef4444"},{"id":"2","name":"Billing","color":"#22c55e"},{"id":"3","name":"General Inquiry","color":"#3b82f6"}],"quickActions":[{"id":"1","title":"Translate ES","action":"Translate the response to Spanish"},{"id":"2","title":"Make Formal","action":"Rewrite the response in a more formal tone"},{"id":"3","title":"Simplify","action":"Simplify the response for easier understanding"}],"aiConfig":{"provider":"local","model":"local-model","apiKey":"http://localhost:1234","temperature":0.7,"maxTokens":1000}}	1	2025-09-13 07:35:19.376931+00	2025-09-13 07:35:19.376931+00
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: supportai
--

COPY public.organizations (id, name, domain, plan_type, plan_status, plan_started_at, plan_expires_at, encrypted_data_key, settings, created_at, updated_at) FROM stdin;
82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	Demo Company	demo.supportai.com	pro	active	2025-09-13 07:35:19.376931+00	\N	9437442828f6c83f292d0bbee8d183b33eca41b8935a97ffa784bb727f4ec78f	{"theme": "light", "timezone": "UTC", "notifications_enabled": true}	2025-09-13 07:35:19.376931+00	2025-09-13 07:35:19.376931+00
7f310e41-8062-4fba-b185-2eba350dd098	Company DEMO	\N	basic	active	2025-09-14 06:21:01.890077+00	\N	different32bytekeyhere123456789012345678901234567890123456	{}	2025-09-14 06:21:01.890077+00	2025-09-14 06:21:01.890077+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: supportai
--

COPY public.users (id, organization_id, email, name, role, is_active, last_login_at, created_at, updated_at) FROM stdin;
573c6356-a89e-452e-b361-9cf5ee7a26ce	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	admin@demo.supportai.com	Demo Admin	admin	t	\N	2025-09-13 07:35:19.376931+00	2025-09-13 07:35:19.376931+00
d08ab6ae-7ffd-4d47-90a2-1996d4ba8082	82ef6e9f-e0b2-419f-82e3-2468ae4c1d21	agent@demo.supportai.com	Demo Agent	agent	t	\N	2025-09-13 07:35:19.376931+00	2025-09-13 07:35:19.376931+00
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: supportai
--

SELECT pg_catalog.setval('public.migrations_id_seq', 1, true);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: draft_replies draft_replies_organization_id_user_id_message_id_key; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.draft_replies
    ADD CONSTRAINT draft_replies_organization_id_user_id_message_id_key UNIQUE (organization_id, user_id, message_id);


--
-- Name: draft_replies draft_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.draft_replies
    ADD CONSTRAINT draft_replies_pkey PRIMARY KEY (id);


--
-- Name: messages messages_organization_id_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_organization_id_ticket_id_key UNIQUE (organization_id, ticket_id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_filename_key UNIQUE (filename);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: organization_settings organization_settings_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_organization_id_key UNIQUE (organization_id);


--
-- Name: organization_settings organization_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_domain_key; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_domain_key UNIQUE (domain);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: users users_organization_id_email_key; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_email_key UNIQUE (organization_id, email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (organization_id, created_at DESC);


--
-- Name: idx_activity_log_organization_id; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_activity_log_organization_id ON public.activity_log USING btree (organization_id);


--
-- Name: idx_draft_replies_user_message; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_draft_replies_user_message ON public.draft_replies USING btree (user_id, message_id);


--
-- Name: idx_messages_agent_id; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_messages_agent_id ON public.messages USING btree (agent_id);


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (organization_id, created_at DESC);


--
-- Name: idx_messages_organization_id; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_messages_organization_id ON public.messages USING btree (organization_id);


--
-- Name: idx_messages_status; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_messages_status ON public.messages USING btree (organization_id, status);


--
-- Name: idx_users_organization_id; Type: INDEX; Schema: public; Owner: supportai
--

CREATE INDEX idx_users_organization_id ON public.users USING btree (organization_id);


--
-- Name: draft_replies update_draft_replies_updated_at; Type: TRIGGER; Schema: public; Owner: supportai
--

CREATE TRIGGER update_draft_replies_updated_at BEFORE UPDATE ON public.draft_replies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: supportai
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organization_settings update_organization_settings_updated_at; Type: TRIGGER; Schema: public; Owner: supportai
--

CREATE TRIGGER update_organization_settings_updated_at BEFORE UPDATE ON public.organization_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: supportai
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: supportai
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_log activity_log_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id);


--
-- Name: activity_log activity_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: draft_replies draft_replies_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.draft_replies
    ADD CONSTRAINT draft_replies_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: draft_replies draft_replies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.draft_replies
    ADD CONSTRAINT draft_replies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: draft_replies draft_replies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.draft_replies
    ADD CONSTRAINT draft_replies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id);


--
-- Name: messages messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_settings organization_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.organization_settings
    ADD CONSTRAINT organization_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: supportai
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: supportai
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: draft_replies; Type: ROW SECURITY; Schema: public; Owner: supportai
--

ALTER TABLE public.draft_replies ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: supportai
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_settings; Type: ROW SECURITY; Schema: public; Owner: supportai
--

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: supportai
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: supportai
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict dB0LqBe7gu15DKQy12iwvYL9HgC0B3yUggWcgoySVRQInDAKKD498eqy2eEg6SX

