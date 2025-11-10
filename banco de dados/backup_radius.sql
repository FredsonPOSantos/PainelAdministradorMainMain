--
-- PostgreSQL database dump
--

\restrict fjU1B9uvKBy4wSe7GfDGlFTdFt8DUAnmZF4QgSqObrTZHPbCHciyoceoaleib9u

-- Dumped from database version 15.14 (Debian 15.14-0+deb12u1)
-- Dumped by pg_dump version 15.14 (Debian 15.14-0+deb12u1)

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
-- Name: admin_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.admin_role AS ENUM (
    'estetica',
    'gestao',
    'master',
    'DPO'
);


ALTER TYPE public.admin_role OWNER TO postgres;

--
-- Name: banner_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.banner_type AS ENUM (
    'pre-login',
    'post-login'
);


ALTER TYPE public.banner_type OWNER TO postgres;

--
-- Name: campaign_target; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.campaign_target AS ENUM (
    'all',
    'group',
    'single_router'
);


ALTER TYPE public.campaign_target OWNER TO postgres;

--
-- Name: login_form_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.login_form_type AS ENUM (
    'simplificado',
    'cadastro_completo',
    'padrao',
    'validacao_sms'
);


ALTER TYPE public.login_form_type OWNER TO postgres;

--
-- Name: router_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.router_status AS ENUM (
    'online',
    'offline'
);


ALTER TYPE public.router_status OWNER TO postgres;

--
-- Name: template_model; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.template_model AS ENUM (
    'V1',
    'V2'
);


ALTER TYPE public.template_model OWNER TO postgres;

--
-- Name: update_ticket_on_new_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_ticket_on_new_message() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE tickets
    SET updated_at = NOW()
    WHERE id = NEW.ticket_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_ticket_on_new_message() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    role public.admin_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    setor character varying(100),
    matricula character varying(50),
    cpf character varying(14),
    must_change_password boolean DEFAULT false NOT NULL,
    reset_token text,
    reset_token_expires timestamp with time zone,
    nome_completo character varying(255)
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_users_id_seq OWNER TO postgres;

--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer,
    user_email character varying(255),
    ip_address character varying(45),
    action character varying(255) NOT NULL,
    status character varying(20) NOT NULL,
    description text,
    target_type character varying(100),
    target_id character varying(100),
    details jsonb
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: TABLE audit_logs; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.audit_logs IS 'Regista eventos de auditoria importantes no sistema para rastreabilidade e segurança.';


--
-- Name: COLUMN audit_logs.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_logs.status IS 'Indica o resultado da ação, como SUCESSO ou FALHA.';


--
-- Name: COLUMN audit_logs.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_logs.description IS 'Sumário legível do que aconteceu. Ex: "Utilizador master@admin.com atualizou o utilizador user@test.com".';


--
-- Name: COLUMN audit_logs.details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.audit_logs.details IS 'Armazena um JSON com detalhes da ação, como valores antigos e novos, para uma auditoria profunda.';


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: authorized_domains; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.authorized_domains (
    id integer NOT NULL,
    domain_name character varying(255) NOT NULL
);


ALTER TABLE public.authorized_domains OWNER TO postgres;

--
-- Name: authorized_domains_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.authorized_domains_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.authorized_domains_id_seq OWNER TO postgres;

--
-- Name: authorized_domains_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.authorized_domains_id_seq OWNED BY public.authorized_domains.id;


--
-- Name: banners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.banners (
    id integer NOT NULL,
    type public.banner_type NOT NULL,
    image_url text NOT NULL,
    display_time_seconds integer DEFAULT 5,
    is_active boolean DEFAULT false,
    name character varying(255) NOT NULL,
    target_url character varying(2048)
);


ALTER TABLE public.banners OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.banners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.banners_id_seq OWNER TO postgres;

--
-- Name: banners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.banners_id_seq OWNED BY public.banners.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    template_id integer NOT NULL,
    target_type public.campaign_target NOT NULL,
    target_id integer,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false,
    CONSTRAINT check_dates CHECK ((end_date >= start_date))
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.campaigns_id_seq OWNER TO postgres;

--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: data_exclusion_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.data_exclusion_requests (
    id integer NOT NULL,
    user_email character varying(255) NOT NULL,
    request_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    completed_by_user_id integer,
    completion_date timestamp with time zone
);


ALTER TABLE public.data_exclusion_requests OWNER TO postgres;

--
-- Name: data_exclusion_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.data_exclusion_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.data_exclusion_requests_id_seq OWNER TO postgres;

--
-- Name: data_exclusion_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.data_exclusion_requests_id_seq OWNED BY public.data_exclusion_requests.id;


--
-- Name: nas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nas (
    id integer NOT NULL,
    nasname text NOT NULL,
    shortname text NOT NULL,
    type text DEFAULT 'other'::text NOT NULL,
    ports integer,
    secret text NOT NULL,
    server text,
    community text,
    description text
);


ALTER TABLE public.nas OWNER TO postgres;

--
-- Name: nas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.nas_id_seq OWNER TO postgres;

--
-- Name: nas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nas_id_seq OWNED BY public.nas.id;


--
-- Name: nasreload; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nasreload (
    nasipaddress inet NOT NULL,
    reloadtime timestamp with time zone NOT NULL
);


ALTER TABLE public.nasreload OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: radius
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    related_ticket_id integer,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO radius;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: radius
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO radius;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: radius
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    permission_key character varying(100) NOT NULL,
    feature_name text,
    action_name text,
    description text
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: TABLE permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.permissions IS 'Define as ações granulares que podem ser permitidas ou negadas.';


--
-- Name: radacct; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radacct (
    radacctid bigint NOT NULL,
    acctsessionid text NOT NULL,
    acctuniqueid text NOT NULL,
    username text,
    realm text,
    nasipaddress inet NOT NULL,
    nasportid text,
    nasporttype text,
    acctstarttime timestamp with time zone,
    acctupdatetime timestamp with time zone,
    acctstoptime timestamp with time zone,
    acctinterval bigint,
    acctsessiontime bigint,
    acctauthentic text,
    connectinfo_start text,
    connectinfo_stop text,
    acctinputoctets bigint,
    acctoutputoctets bigint,
    calledstationid text,
    callingstationid text,
    acctterminatecause text,
    servicetype text,
    framedprotocol text,
    framedipaddress inet,
    framedipv6address inet,
    framedipv6prefix inet,
    framedinterfaceid text,
    delegatedipv6prefix inet,
    class text
);


ALTER TABLE public.radacct OWNER TO postgres;

--
-- Name: radacct_radacctid_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radacct_radacctid_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.radacct_radacctid_seq OWNER TO postgres;

--
-- Name: radacct_radacctid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radacct_radacctid_seq OWNED BY public.radacct.radacctid;


--
-- Name: radcheck; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radcheck (
    id integer NOT NULL,
    username text DEFAULT ''::text NOT NULL,
    attribute text DEFAULT ''::text NOT NULL,
    op character varying(2) DEFAULT '=='::character varying NOT NULL,
    value text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.radcheck OWNER TO postgres;

--
-- Name: radcheck_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radcheck_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.radcheck_id_seq OWNER TO postgres;

--
-- Name: radcheck_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radcheck_id_seq OWNED BY public.radcheck.id;


--
-- Name: radgroupcheck; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radgroupcheck (
    id integer NOT NULL,
    groupname text DEFAULT ''::text NOT NULL,
    attribute text DEFAULT ''::text NOT NULL,
    op character varying(2) DEFAULT '=='::character varying NOT NULL,
    value text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.radgroupcheck OWNER TO postgres;

--
-- Name: radgroupcheck_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radgroupcheck_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.radgroupcheck_id_seq OWNER TO postgres;

--
-- Name: radgroupcheck_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radgroupcheck_id_seq OWNED BY public.radgroupcheck.id;


--
-- Name: radgroupreply; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radgroupreply (
    id integer NOT NULL,
    groupname text DEFAULT ''::text NOT NULL,
    attribute text DEFAULT ''::text NOT NULL,
    op character varying(2) DEFAULT '='::character varying NOT NULL,
    value text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.radgroupreply OWNER TO postgres;

--
-- Name: radgroupreply_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radgroupreply_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.radgroupreply_id_seq OWNER TO postgres;

--
-- Name: radgroupreply_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radgroupreply_id_seq OWNED BY public.radgroupreply.id;


--
-- Name: radpostauth; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radpostauth (
    id bigint NOT NULL,
    username text NOT NULL,
    pass text,
    reply text,
    calledstationid text,
    callingstationid text,
    authdate timestamp with time zone DEFAULT now() NOT NULL,
    class text
);


ALTER TABLE public.radpostauth OWNER TO postgres;

--
-- Name: radpostauth_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radpostauth_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.radpostauth_id_seq OWNER TO postgres;

--
-- Name: radpostauth_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radpostauth_id_seq OWNED BY public.radpostauth.id;


--
-- Name: radreply; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radreply (
    id integer NOT NULL,
    username text DEFAULT ''::text NOT NULL,
    attribute text DEFAULT ''::text NOT NULL,
    op character varying(2) DEFAULT '='::character varying NOT NULL,
    value text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.radreply OWNER TO postgres;

--
-- Name: radreply_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radreply_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.radreply_id_seq OWNER TO postgres;

--
-- Name: radreply_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radreply_id_seq OWNED BY public.radreply.id;


--
-- Name: radusergroup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.radusergroup (
    id integer NOT NULL,
    username text DEFAULT ''::text NOT NULL,
    groupname text DEFAULT ''::text NOT NULL,
    priority integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.radusergroup OWNER TO postgres;

--
-- Name: radusergroup_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.radusergroup_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.radusergroup_id_seq OWNER TO postgres;

--
-- Name: radusergroup_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.radusergroup_id_seq OWNED BY public.radusergroup.id;


--
-- Name: raffle_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.raffle_participants (
    id integer NOT NULL,
    raffle_id integer NOT NULL,
    user_id integer NOT NULL
);


ALTER TABLE public.raffle_participants OWNER TO postgres;

--
-- Name: raffle_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.raffle_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.raffle_participants_id_seq OWNER TO postgres;

--
-- Name: raffle_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.raffle_participants_id_seq OWNED BY public.raffle_participants.id;


--
-- Name: raffles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.raffles (
    id integer NOT NULL,
    raffle_number character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    observation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_user_id integer,
    winner_id integer,
    filters jsonb
);


ALTER TABLE public.raffles OWNER TO postgres;

--
-- Name: raffles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.raffles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.raffles_id_seq OWNER TO postgres;

--
-- Name: raffles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.raffles_id_seq OWNED BY public.raffles.id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_name character varying(50) NOT NULL,
    permission_key character varying(100) NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: TABLE role_permissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.role_permissions IS 'Associa quais permissões cada função possui.';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role_name character varying(50) NOT NULL,
    description text
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: TABLE roles; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.roles IS 'Armazena os nomes e descrições das funções de utilizador (master, gestao, etc.).';


--
-- Name: rotahotspot_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rotahotspot_details (
    id integer NOT NULL,
    username character varying(64) NOT NULL,
    nome_completo character varying(255),
    telefone character varying(20),
    mac_address character varying(17),
    router_name character varying(255),
    data_cadastro timestamp with time zone DEFAULT now(),
    ultimo_login timestamp with time zone
);


ALTER TABLE public.rotahotspot_details OWNER TO postgres;

--
-- Name: rotahotspot_details_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rotahotspot_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.rotahotspot_details_id_seq OWNER TO postgres;

--
-- Name: rotahotspot_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rotahotspot_details_id_seq OWNED BY public.rotahotspot_details.id;


--
-- Name: router_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.router_groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    observacao text
);


ALTER TABLE public.router_groups OWNER TO postgres;

--
-- Name: router_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.router_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.router_groups_id_seq OWNER TO postgres;

--
-- Name: router_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.router_groups_id_seq OWNED BY public.router_groups.id;


--
-- Name: routers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.routers (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    status public.router_status DEFAULT 'offline'::public.router_status,
    last_seen timestamp with time zone,
    group_id integer,
    observacao text,
    ip_address character varying(15)
);


ALTER TABLE public.routers OWNER TO postgres;

--
-- Name: routers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.routers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.routers_id_seq OWNER TO postgres;

--
-- Name: routers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.routers_id_seq OWNED BY public.routers.id;


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer DEFAULT 1 NOT NULL,
    company_name character varying(100),
    logo_url character varying(255),
    primary_color character varying(10),
    session_timeout_minutes integer DEFAULT 60,
    domain_whitelist text[] DEFAULT ARRAY[]::text[],
    background_color character varying(7) DEFAULT '#1a202c'::character varying,
    font_color character varying(7) DEFAULT '#edf2f7'::character varying,
    font_family character varying(100) DEFAULT '''Inter'', sans-serif'::character varying,
    font_size integer DEFAULT 16,
    background_image_url character varying(255),
    modal_background_color character varying(20),
    modal_font_color character varying(20),
    modal_border_color character varying(20),
    sidebar_color character varying(20),
    login_background_color character varying(100),
    login_form_background_color character varying(100),
    login_font_color character varying(100),
    login_button_color character varying(20) DEFAULT '#062f51'::character varying,
    login_logo_url character varying(255)
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    base_model public.template_model NOT NULL,
    login_background_url text,
    logo_url text,
    primary_color character varying(7) DEFAULT '#4A90E2'::character varying,
    font_size character varying(10) DEFAULT '16px'::character varying,
    promo_video_url text,
    login_type public.login_form_type NOT NULL,
    font_color character varying(7) DEFAULT '#2d3748'::character varying,
    prelogin_banner_id integer
);


ALTER TABLE public.templates OWNER TO postgres;

--
-- Name: templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.templates_id_seq OWNER TO postgres;

--
-- Name: templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.templates_id_seq OWNED BY public.templates.id;


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_messages (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    user_id integer NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ticket_messages OWNER TO postgres;

--
-- Name: TABLE ticket_messages; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ticket_messages IS 'Armazena a trilha de conversa para cada ticket.';


--
-- Name: ticket_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_messages_id_seq OWNER TO postgres;

--
-- Name: ticket_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_messages_id_seq OWNED BY public.ticket_messages.id;


--
-- Name: ticket_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket_ratings (
    id integer NOT NULL,
    ticket_id integer NOT NULL,
    user_id integer NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ticket_ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.ticket_ratings OWNER TO postgres;

--
-- Name: TABLE ticket_ratings; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.ticket_ratings IS 'Armazena as avaliações dos tickets de suporte.';


--
-- Name: COLUMN ticket_ratings.rating; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.ticket_ratings.rating IS 'A avaliação dada pelo utilizador, de 1 a 5 estrelas.';


--
-- Name: ticket_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.ticket_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ticket_ratings_id_seq OWNER TO postgres;

--
-- Name: ticket_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.ticket_ratings_id_seq OWNED BY public.ticket_ratings.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    ticket_number character varying(255) NOT NULL,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'open'::character varying NOT NULL,
    created_by_user_id integer NOT NULL,
    assigned_to_user_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tickets OWNER TO postgres;

--
-- Name: TABLE tickets; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.tickets IS 'Armazena os tickets de suporte.';


--
-- Name: COLUMN tickets.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.tickets.status IS 'Status atual do ticket (ex: open, in_progress, closed).';


--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tickets_id_seq OWNER TO postgres;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: userdetails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.userdetails (
    id integer NOT NULL,
    username character varying(64) NOT NULL,
    nome_completo character varying(255),
    telefone character varying(20),
    mac_address character varying(17),
    router_name character varying(255),
    data_cadastro timestamp with time zone DEFAULT now(),
    ultimo_login timestamp with time zone,
    accepts_marketing boolean DEFAULT false
);


ALTER TABLE public.userdetails OWNER TO postgres;

--
-- Name: userdetails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.userdetails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.userdetails_id_seq OWNER TO postgres;

--
-- Name: userdetails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.userdetails_id_seq OWNED BY public.userdetails.id;


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: authorized_domains id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorized_domains ALTER COLUMN id SET DEFAULT nextval('public.authorized_domains_id_seq'::regclass);


--
-- Name: banners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners ALTER COLUMN id SET DEFAULT nextval('public.banners_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: data_exclusion_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_exclusion_requests ALTER COLUMN id SET DEFAULT nextval('public.data_exclusion_requests_id_seq'::regclass);


--
-- Name: nas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nas ALTER COLUMN id SET DEFAULT nextval('public.nas_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: radius
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: radacct radacctid; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radacct ALTER COLUMN radacctid SET DEFAULT nextval('public.radacct_radacctid_seq'::regclass);


--
-- Name: radcheck id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radcheck ALTER COLUMN id SET DEFAULT nextval('public.radcheck_id_seq'::regclass);


--
-- Name: radgroupcheck id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radgroupcheck ALTER COLUMN id SET DEFAULT nextval('public.radgroupcheck_id_seq'::regclass);


--
-- Name: radgroupreply id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radgroupreply ALTER COLUMN id SET DEFAULT nextval('public.radgroupreply_id_seq'::regclass);


--
-- Name: radpostauth id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radpostauth ALTER COLUMN id SET DEFAULT nextval('public.radpostauth_id_seq'::regclass);


--
-- Name: radreply id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radreply ALTER COLUMN id SET DEFAULT nextval('public.radreply_id_seq'::regclass);


--
-- Name: radusergroup id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radusergroup ALTER COLUMN id SET DEFAULT nextval('public.radusergroup_id_seq'::regclass);


--
-- Name: raffle_participants id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffle_participants ALTER COLUMN id SET DEFAULT nextval('public.raffle_participants_id_seq'::regclass);


--
-- Name: raffles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffles ALTER COLUMN id SET DEFAULT nextval('public.raffles_id_seq'::regclass);


--
-- Name: rotahotspot_details id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotahotspot_details ALTER COLUMN id SET DEFAULT nextval('public.rotahotspot_details_id_seq'::regclass);


--
-- Name: router_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.router_groups ALTER COLUMN id SET DEFAULT nextval('public.router_groups_id_seq'::regclass);


--
-- Name: routers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routers ALTER COLUMN id SET DEFAULT nextval('public.routers_id_seq'::regclass);


--
-- Name: templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates ALTER COLUMN id SET DEFAULT nextval('public.templates_id_seq'::regclass);


--
-- Name: ticket_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages ALTER COLUMN id SET DEFAULT nextval('public.ticket_messages_id_seq'::regclass);


--
-- Name: ticket_ratings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_ratings ALTER COLUMN id SET DEFAULT nextval('public.ticket_ratings_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: userdetails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userdetails ALTER COLUMN id SET DEFAULT nextval('public.userdetails_id_seq'::regclass);


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, email, password_hash, role, is_active, created_at, setor, matricula, cpf, must_change_password, reset_token, reset_token_expires, nome_completo) FROM stdin;
16	dpo@email.com	$2b$10$JTU3WJHI/Lf96HKpj9AgaezqeULxti/GZ6qucCgwhROMFmkitwQcG	DPO	t	2025-11-02 19:43:00.07724-03	ti	8182	22645620129	f	\N	\N	DPO
19	nti@rotatransportes.com.br	$2b$10$TqlIcQo48O0uOhvITOscKOMOLrpTgw6ydQe492ZYedbT4A4ITCk1G	DPO	t	2025-11-02 20:23:04.002384-03	ti	1648	19482635187	f	\N	\N	nucleo de tecnologia
20	marketing@email.com	$2b$10$vY9Pyo.PC4h7xbN9L5C11e8Oc8g1GT5eh3LUaouc9aZjg7AzfBVIC	estetica	t	2025-11-03 00:39:46.770131-03	Marketing	8089	48735612845	f	\N	\N	marketing
21	gestao@email.com	$2b$10$joEYBCNV1dT8p68SxgzD1.vU.s0u2jjf6BoYX16p6kCiQkVtVuonu	gestao	t	2025-11-04 10:32:55.518782-03	ti	46135	48234175469	f	\N	\N	gestão
22	son.magometal@gmail.com	$2b$10$EWFTBGbR/tbrMUogUZRwOO5AVhP6A0fSffTxcOZIulDJjLSkH..j6	master	t	2025-11-09 19:51:06.825479-03	ti	6164	26515344829	f	\N	\N	fredson
1	ti@rotatransportes.com.br	$2b$10$WoyJLYmnkMQ4PqJ6TQmXkevUIW5h/GU.Pyze76NozNiE8wBhfsqOO	master	t	2025-10-10 20:24:46.597026-03	NTI	8085	22535800829	f	\N	\N	Núcleo de Tecnologia e Informação
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, "timestamp", user_id, user_email, ip_address, action, status, description, target_type, target_id, details) FROM stdin;
1	2025-11-02 23:17:02.298103-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
2	2025-11-02 23:17:42.717353-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
3	2025-11-02 23:18:17.747121-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
4	2025-11-02 23:18:35.431068-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_UPDATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou o utilizador "nti@rotatransportes.com.br" (ID: 19).	user	19	\N
5	2025-11-02 23:19:05.41651-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
6	2025-11-02 23:19:42.031662-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
7	2025-11-02 23:23:44.043672-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
8	2025-11-02 23:36:31.930001-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
9	2025-11-02 23:37:53.599181-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
10	2025-11-02 23:38:23.664261-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
11	2025-11-02 23:47:19.548276-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
12	2025-11-02 23:47:44.286035-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
13	2025-11-02 23:49:16.463491-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
14	2025-11-02 23:50:07.553699-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
15	2025-11-02 23:50:25.360264-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
16	2025-11-02 23:50:38.413255-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_UPDATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou o utilizador "nti@rotatransportes.com.br" (ID: 19).	user	19	\N
17	2025-11-02 23:50:45.427895-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TEMPLATE_UPDATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou o template "Template GB".	template	7	\N
18	2025-11-02 23:50:50.2839-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	CAMPAIGN_UPDATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a campanha "Campanha de Fim de Ano 2 e meio".	campaign	8	\N
19	2025-11-02 23:51:22.299002-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
20	2025-11-03 00:08:48.768134-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
21	2025-11-03 00:09:08.46726-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
22	2025-11-03 00:11:04.436606-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "logs.read"}]}
23	2025-11-03 00:11:18.730726-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": true, "permission": "logs.read"}]}
24	2025-11-03 00:26:32.916212-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
25	2025-11-03 00:27:38.008684-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
26	2025-11-03 00:39:07.802765-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
27	2025-11-03 00:39:46.816934-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_CREATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" criou o novo utilizador "marketing@email.com" (ID: 20).	user	20	\N
28	2025-11-03 00:40:03.708544-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_PASSWORD_RESET	SUCCESS	Utilizador "ti@rotatransportes.com.br" resetou a senha do utilizador com ID 20.	user	20	\N
29	2025-11-03 00:40:45.789085-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
30	2025-11-03 00:42:08.854497-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
31	2025-11-03 00:42:28.825421-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou para "marketing@email.com": senha incorreta.	\N	\N	\N
32	2025-11-03 00:42:44.601531-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
33	2025-11-03 00:44:18.339725-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
34	2025-11-03 00:46:21.962573-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
35	2025-11-03 00:47:43.773333-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
36	2025-11-03 00:48:02.478381-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
37	2025-11-03 00:48:40.236317-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
38	2025-11-03 00:50:14.6215-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_PASSWORD_RESET	SUCCESS	Utilizador "ti@rotatransportes.com.br" resetou a senha do utilizador com ID 20.	user	20	\N
39	2025-11-03 00:50:30.417895-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
40	2025-11-03 00:53:47.162205-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
41	2025-11-03 00:54:12.599142-03	20	marketing@email.com	::ffff:127.0.0.1	USER_PASSWORD_CHANGE	SUCCESS	Utilizador "marketing@email.com" alterou a sua própria senha com sucesso.	user	20	\N
42	2025-11-03 00:54:22.445717-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
43	2025-11-03 00:55:56.869777-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
44	2025-11-03 00:58:06.579213-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
45	2025-11-03 00:59:26.88231-03	20	marketing@email.com	::ffff:127.0.0.1	CAMPAIGN_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou a campanha "Campanha de Fim de Ano 2 e meio".	campaign	8	\N
46	2025-11-03 00:59:39.690528-03	20	marketing@email.com	::ffff:127.0.0.1	TEMPLATE_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou o template "Template GB".	template	7	\N
47	2025-11-03 00:59:54.982523-03	20	marketing@email.com	::ffff:127.0.0.1	BANNER_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou o banner "Grupo Brasileiro 2025".	banner	5	\N
48	2025-11-03 01:01:36.648881-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
49	2025-11-03 01:05:04.929898-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
50	2025-11-03 01:05:29.933551-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
51	2025-11-03 08:57:25.027153-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
52	2025-11-03 18:17:21.997895-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
53	2025-11-03 19:04:19.762406-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
54	2025-11-03 19:39:59.750938-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
55	2025-11-03 19:40:56.338235-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
56	2025-11-03 19:41:58.033515-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
57	2025-11-03 19:57:44.406909-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
58	2025-11-03 20:03:16.455425-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
59	2025-11-03 20:04:32.919566-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
60	2025-11-03 20:05:21.691237-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
61	2025-11-03 20:06:26.729812-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
62	2025-11-03 20:07:44.830426-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
63	2025-11-03 20:08:16.917775-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
64	2025-11-03 20:14:51.951478-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_USER_DELETE	SUCCESS	Utilizador "dpo@email.com" eliminou o utilizador do hotspot com e-mail "fredson@email.com" (ID: 1) por motivos de LGPD.	hotspot_user	1	\N
65	2025-11-03 20:15:18.405844-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_REQUEST_COMPLETE	SUCCESS	Utilizador "dpo@email.com" marcou o pedido de exclusão de dados para o e-mail "nti@rotatransportes.com.br" (ID: 1) como concluído.	lgpd_request	1	\N
66	2025-11-03 20:15:26.420699-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_REQUEST_COMPLETE	SUCCESS	Utilizador "dpo@email.com" marcou o pedido de exclusão de dados para o e-mail "fulano@email.com" (ID: 2) como concluído.	lgpd_request	2	\N
67	2025-11-03 20:22:36.966992-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_USER_DELETE	SUCCESS	Utilizador "dpo@email.com" eliminou o utilizador do hotspot com e-mail "daniela.moraes@email.com" (ID: 29) por motivos de LGPD.	hotspot_user	29	\N
68	2025-11-03 20:28:05.475882-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
69	2025-11-03 20:31:13.390396-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
70	2025-11-03 20:32:42.139749-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
71	2025-11-03 20:38:50.184225-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
72	2025-11-03 20:39:30.329518-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
73	2025-11-03 20:40:50.875073-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
74	2025-11-03 20:44:11.40049-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
75	2025-11-03 20:45:57.658071-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
76	2025-11-03 20:57:32.748044-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
77	2025-11-03 20:58:41.861997-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
78	2025-11-03 20:59:30.016587-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
79	2025-11-03 20:59:54.614984-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
80	2025-11-03 21:00:51.874198-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
81	2025-11-03 21:11:25.564155-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
82	2025-11-03 21:25:52.290616-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
83	2025-11-03 21:26:54.098624-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
84	2025-11-03 21:27:27.867191-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
85	2025-11-03 21:28:44.124189-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
86	2025-11-03 21:29:37.568899-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
87	2025-11-03 21:36:18.665156-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
88	2025-11-03 21:37:51.991797-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
89	2025-11-03 21:39:13.205352-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
90	2025-11-03 21:43:56.349742-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
91	2025-11-03 21:47:41.762432-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_REQUEST_COMPLETE	SUCCESS	Utilizador "dpo@email.com" marcou o pedido de exclusão de dados para o e-mail "usuariopadrao@email.com" (ID: 3) como concluído.	lgpd_request	3	\N
92	2025-11-03 21:48:26.693592-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_REQUEST_COMPLETE	SUCCESS	Utilizador "dpo@email.com" marcou o pedido de exclusão de dados para o e-mail "gestao@email.com" (ID: 4) como concluído.	lgpd_request	4	\N
93	2025-11-03 21:53:34.830943-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
94	2025-11-03 21:53:57.729874-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_USER_DELETE	SUCCESS	Utilizador "dpo@email.com" eliminou o utilizador do hotspot com e-mail "aline.gomes@email.com" (ID: 11) por motivos de LGPD.	hotspot_user	11	\N
95	2025-11-03 21:56:42.925596-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
96	2025-11-03 21:58:18.781462-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
97	2025-11-03 21:58:49.815194-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
98	2025-11-03 22:01:34.007348-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
99	2025-11-03 22:04:00.602652-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
100	2025-11-03 22:04:55.665477-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
101	2025-11-03 22:05:43.513289-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
102	2025-11-03 22:16:46.114463-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_USER_DELETE	SUCCESS	Utilizador "dpo@email.com" eliminou o utilizador do hotspot com e-mail "aline.castro@email.com" (ID: 31) por motivos de LGPD.	hotspot_user	31	\N
103	2025-11-03 22:16:48.861861-03	16	dpo@email.com	::ffff:127.0.0.1	LGPD_REQUEST_COMPLETE	SUCCESS	Utilizador "dpo@email.com" marcou o pedido de exclusão de dados para o e-mail "anapaula@e-mail.com" (ID: 5) como concluído.	lgpd_request	5	\N
104	2025-11-03 22:26:19.583728-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
105	2025-11-03 22:52:58.627518-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
106	2025-11-03 22:53:28.762864-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
107	2025-11-03 23:09:54.459923-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
108	2025-11-03 23:21:53.351133-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
109	2025-11-03 23:25:29.663912-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
110	2025-11-03 23:27:18.764833-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
111	2025-11-03 23:34:57.369311-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
112	2025-11-03 23:35:19.373393-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #031120252335-3 criado por marketing@email.com	ticket	3	\N
113	2025-11-03 23:35:42.423803-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
114	2025-11-03 23:43:28.912794-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 3	ticket	3	\N
115	2025-11-03 23:43:42.767478-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
116	2025-11-03 23:44:28.163789-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 3	ticket	3	\N
117	2025-11-03 23:44:40.307499-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
118	2025-11-03 23:46:20.137216-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	ti@rotatransportes.com.br atribuiu o ticket ID 3 ao utilizador ID 16	ticket	3	\N
119	2025-11-03 23:46:37.367952-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
120	2025-11-03 23:48:57.129845-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
121	2025-11-03 23:49:25.829091-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	ti@rotatransportes.com.br alterou o status do ticket ID 3 para closed	ticket	3	\N
122	2025-11-04 06:51:11.526386-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
123	2025-11-04 10:09:59.601249-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
124	2025-11-04 10:22:33.219473-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
125	2025-11-04 10:23:40.600606-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
126	2025-11-04 10:24:49.709452-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
127	2025-11-04 10:25:16.9039-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
128	2025-11-04 10:30:23.013821-03	\N	gestao@email.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "gestao@email.com" não encontrado.	\N	\N	\N
129	2025-11-04 10:31:00.928089-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
130	2025-11-04 10:32:55.558684-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_CREATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" criou o novo utilizador "gestao@email.com" (ID: 21).	user	21	\N
131	2025-11-04 10:33:59.413516-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
132	2025-11-04 10:34:13.045978-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
133	2025-11-04 10:34:28.818383-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_UPDATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou o utilizador "gestao@email.com" (ID: 21).	user	21	\N
134	2025-11-04 10:34:41.66698-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
135	2025-11-04 10:37:31.45944-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
136	2025-11-04 11:29:20.749146-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
137	2025-11-04 11:41:44.781366-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
138	2025-11-04 12:13:23.301317-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
139	2025-11-04 12:23:27.318565-03	20	marketing@email.com	::ffff:172.16.12.239	LOGIN_FAILURE	FAILURE	Tentativa de login falhou para "marketing@email.com": senha incorreta.	\N	\N	\N
140	2025-11-04 12:24:34.715391-03	20	marketing@email.com	::ffff:172.16.12.239	LOGIN_FAILURE	FAILURE	Tentativa de login falhou para "marketing@email.com": senha incorreta.	\N	\N	\N
141	2025-11-04 13:12:07.816204-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
142	2025-11-04 13:12:22.927214-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
143	2025-11-04 13:33:26.065355-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
144	2025-11-04 13:34:40.902769-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
145	2025-11-04 18:00:24.082226-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
146	2025-11-04 18:22:04.983121-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
147	2025-11-04 18:34:15.298846-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
148	2025-11-04 18:35:33.229751-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
149	2025-11-04 18:37:26.255363-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
150	2025-11-04 18:40:13.776884-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
151	2025-11-04 18:44:11.761796-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
152	2025-11-04 18:53:01.534599-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
153	2025-11-04 19:06:30.780897-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
154	2025-11-04 19:11:56.731754-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
155	2025-11-04 19:12:29.279987-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
156	2025-11-04 19:12:40.833286-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120251912-18 criado por marketing@email.com	ticket	18	\N
157	2025-11-04 19:13:32.851141-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
158	2025-11-04 19:14:29.571862-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
159	2025-11-04 19:14:54.649639-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120251915-19 criado por dpo@email.com	ticket	19	\N
160	2025-11-04 19:15:51.032841-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
161	2025-11-04 19:17:07.182052-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
162	2025-11-04 19:17:27.09623-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
163	2025-11-04 19:17:40.237254-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
164	2025-11-04 19:17:51.658753-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120251918-20 criado por marketing@email.com	ticket	20	\N
165	2025-11-04 19:18:01.064271-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
166	2025-11-04 19:18:11.565263-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
167	2025-11-04 19:18:21.491029-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
168	2025-11-04 19:19:25.90939-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
169	2025-11-04 19:19:38.182815-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
170	2025-11-04 19:20:56.036883-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
171	2025-11-04 19:27:03.130302-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
172	2025-11-04 19:27:19.197069-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120251927-21 criado por marketing@email.com	ticket	21	\N
173	2025-11-04 19:30:37.689878-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 18	ticket	18	\N
174	2025-11-04 19:30:50.883497-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 21	ticket	21	\N
176	2025-11-04 19:31:05.564536-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
175	2025-11-04 19:30:57.331963-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 20	ticket	20	\N
177	2025-11-04 19:31:29.745549-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	dpo@email.com alterou o status do ticket ID 19 para closed	ticket	19	\N
178	2025-11-04 19:31:41.090832-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120251931-22 criado por dpo@email.com	ticket	22	\N
179	2025-11-04 19:32:02.752093-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
180	2025-11-04 19:33:29.11232-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
181	2025-11-04 19:33:45.211555-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 20	ticket	20	\N
182	2025-11-04 19:34:00.158446-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
183	2025-11-04 19:45:29.378055-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
184	2025-11-04 19:54:09.437759-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
185	2025-11-04 19:55:04.865676-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
186	2025-11-04 19:55:19.353722-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
187	2025-11-04 19:55:45.090304-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
188	2025-11-04 19:55:54.104912-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
189	2025-11-04 19:56:07.347457-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
190	2025-11-04 19:56:39.076418-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
191	2025-11-04 19:56:49.936087-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
192	2025-11-04 19:57:07.022949-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
193	2025-11-04 19:57:16.242063-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
194	2025-11-04 19:57:35.795087-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
195	2025-11-04 19:57:45.485475-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
196	2025-11-04 19:57:59.252813-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
197	2025-11-04 19:58:35.366601-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
198	2025-11-04 19:59:48.160857-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252000-23 criado por gestao@email.com	ticket	23	\N
199	2025-11-04 20:00:07.228609-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	gestao@email.com alterou o status do ticket ID 23 para in_progress	ticket	23	\N
200	2025-11-04 20:00:19.515986-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	gestao@email.com alterou o status do ticket ID 23 para closed	ticket	23	\N
201	2025-11-04 20:00:28.507389-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
202	2025-11-04 20:00:37.84871-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 18 para in_progress	ticket	18	\N
203	2025-11-04 20:00:39.721151-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 21 para in_progress	ticket	21	\N
204	2025-11-04 20:00:41.511533-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 20 para in_progress	ticket	20	\N
205	2025-11-04 20:00:53.895464-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252001-24 criado por marketing@email.com	ticket	24	\N
206	2025-11-04 20:01:10.284793-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
207	2025-11-04 20:22:02.790453-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
208	2025-11-04 20:24:11.143016-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
209	2025-11-04 20:41:59.574308-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
210	2025-11-04 20:42:28.584576-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	ti@rotatransportes.com.br encaminhou o ticket ID 20 para o utilizador ID 19	ticket	20	\N
211	2025-11-04 20:43:10.700331-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	ti@rotatransportes.com.br encaminhou o ticket ID 21 para o utilizador ID 21	ticket	21	\N
212	2025-11-04 20:43:42.732554-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	ti@rotatransportes.com.br encaminhou o ticket ID 20 para o utilizador ID 19	ticket	20	\N
213	2025-11-04 20:43:56.942981-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
214	2025-11-04 20:44:15.998554-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	gestao@email.com respondeu ao ticket ID 22	ticket	22	\N
215	2025-11-04 20:44:27.988452-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	gestao@email.com alterou o status do ticket ID 22 para in_progress	ticket	22	\N
216	2025-11-04 20:45:11.870372-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
217	2025-11-04 20:45:33.07862-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
218	2025-11-04 20:45:52.010004-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252046-27 criado por marketing@email.com	ticket	27	\N
219	2025-11-04 20:46:03.815201-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
220	2025-11-04 20:46:23.18077-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
221	2025-11-04 20:52:13.754466-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252052-28 criado por ti@rotatransportes.com.br	ticket	28	\N
222	2025-11-04 20:52:18.73938-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	ti@rotatransportes.com.br encaminhou o ticket ID 28 para o utilizador ID 21	ticket	28	\N
223	2025-11-04 20:52:49.714254-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
224	2025-11-04 20:53:37.767389-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	gestao@email.com alterou o status do ticket ID 27 para in_progress	ticket	27	\N
225	2025-11-04 20:55:03.257323-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
226	2025-11-04 20:56:02.109882-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252056-29 criado por ti@rotatransportes.com.br	ticket	29	\N
227	2025-11-04 20:58:17.830852-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
228	2025-11-04 20:59:00.405304-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	gestao@email.com respondeu ao ticket ID 29	ticket	29	\N
229	2025-11-04 20:59:12.167122-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	gestao@email.com encaminhou o ticket ID 29 para o utilizador ID 16	ticket	29	\N
230	2025-11-04 20:59:27.51459-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
231	2025-11-04 21:01:34.781122-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
232	2025-11-04 21:01:42.597599-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 27 para closed	ticket	27	\N
233	2025-11-04 21:01:57.282294-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 20 para closed	ticket	20	\N
234	2025-11-04 21:02:24.195894-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
235	2025-11-04 21:03:05.353537-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
236	2025-11-04 21:03:34.327271-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 21 para closed	ticket	21	\N
237	2025-11-04 21:03:38.817823-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 18 para closed	ticket	18	\N
238	2025-11-04 21:03:44.971229-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	marketing@email.com alterou o status do ticket ID 24 para closed	ticket	24	\N
239	2025-11-04 21:04:20.489007-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252104-30 criado por marketing@email.com	ticket	30	\N
240	2025-11-04 21:04:32.952507-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
241	2025-11-04 21:04:51.524169-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	gestao@email.com encaminhou o ticket ID 30 para o utilizador ID 16	ticket	30	\N
242	2025-11-04 21:04:58.385468-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
243	2025-11-04 21:05:18.190982-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 30	ticket	30	\N
244	2025-11-04 21:05:21.407264-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	dpo@email.com alterou o status do ticket ID 30 para closed	ticket	30	\N
245	2025-11-04 21:27:29.198509-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
246	2025-11-04 21:28:00.64236-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252128-31 criado por marketing@email.com	ticket	31	\N
247	2025-11-04 21:28:09.644573-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
248	2025-11-04 21:30:49.36312-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
249	2025-11-04 21:31:34.613317-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
250	2025-11-04 21:32:50.310495-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
251	2025-11-04 21:33:02.980528-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
252	2025-11-04 21:38:49.178784-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_BACKGROUND	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a imagem de fundo.	settings	\N	\N
253	2025-11-04 21:39:42.964997-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_BACKGROUND	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a imagem de fundo.	settings	\N	\N
254	2025-11-04 21:40:11.39484-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
255	2025-11-04 21:42:48.795587-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
256	2025-11-04 21:43:14.803191-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
257	2025-11-04 21:43:34.672439-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_BACKGROUND	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a imagem de fundo.	settings	\N	\N
258	2025-11-04 21:44:10.699095-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
259	2025-11-04 21:45:06.864952-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 31	ticket	31	\N
260	2025-11-04 21:45:12.420078-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 31	ticket	31	\N
261	2025-11-04 21:45:15.483143-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 31	ticket	31	\N
262	2025-11-04 21:45:17.670291-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 31	ticket	31	\N
263	2025-11-04 21:45:19.887606-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 31	ticket	31	\N
264	2025-11-04 21:45:23.245314-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 31	ticket	31	\N
265	2025-11-04 21:45:27.215101-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	marketing@email.com respondeu ao ticket ID 31	ticket	31	\N
266	2025-11-04 21:45:45.104116-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
267	2025-11-04 21:47:48.020491-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	ti@rotatransportes.com.br encaminhou o ticket ID 31 para o utilizador ID 16	ticket	31	\N
268	2025-11-04 21:48:01.120748-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
269	2025-11-04 22:01:03.510316-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
270	2025-11-04 22:01:52.650793-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
271	2025-11-04 22:03:12.842604-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
272	2025-11-04 22:05:20.448035-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
273	2025-11-04 22:05:33.669025-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
274	2025-11-04 22:06:12.312311-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
275	2025-11-04 22:06:31.788975-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
276	2025-11-04 22:06:47.935286-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
277	2025-11-04 22:07:05.300534-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_STATUS_UPDATE	SUCCESS	gestao@email.com alterou o status do ticket ID 22 para closed	ticket	22	\N
278	2025-11-04 22:10:32.551675-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
279	2025-11-04 22:10:44.823301-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252211-32 criado por dpo@email.com	ticket	32	\N
280	2025-11-04 22:10:48.921064-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252211-33 criado por dpo@email.com	ticket	33	\N
281	2025-11-04 22:10:53.698626-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252211-34 criado por dpo@email.com	ticket	34	\N
282	2025-11-04 22:10:57.94842-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252211-35 criado por dpo@email.com	ticket	35	\N
283	2025-11-04 22:11:02.785847-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #041120252211-36 criado por dpo@email.com	ticket	36	\N
284	2025-11-04 22:48:07.125048-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
285	2025-11-04 23:08:28.984218-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 36	ticket	36	\N
286	2025-11-05 07:02:31.178443-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
287	2025-11-05 09:41:56.791271-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
288	2025-11-05 10:52:17.61368-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
289	2025-11-05 10:52:49.395024-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 36	ticket	36	\N
290	2025-11-05 11:43:50.778298-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 36	ticket	36	\N
291	2025-11-05 11:50:18.195692-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
292	2025-11-05 11:51:02.312234-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 36	ticket	36	\N
293	2025-11-05 11:53:32.77817-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 36	ticket	36	\N
294	2025-11-05 13:47:04.081677-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
295	2025-11-05 13:52:41.271835-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 36	ticket	36	\N
296	2025-11-05 15:03:02.919935-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 36	ticket	36	\N
297	2025-11-05 15:24:12.15678-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	dpo@email.com respondeu ao ticket ID 35	ticket	35	\N
298	2025-11-05 15:24:34.225346-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
299	2025-11-05 15:25:10.53186-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
300	2025-11-05 15:26:54.258384-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	gestao@email.com respondeu ao ticket ID 35	ticket	35	\N
301	2025-11-05 16:43:12.717632-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	gestao@email.com respondeu ao ticket ID 35	ticket	35	\N
302	2025-11-05 16:49:59.509614-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	gestao@email.com respondeu ao ticket ID 36	ticket	36	\N
303	2025-11-05 16:50:26.012564-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
304	2025-11-05 16:51:07.303843-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120251651-37 criado por marketing@email.com	ticket	37	\N
305	2025-11-05 16:51:19.572828-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
306	2025-11-05 16:51:47.497451-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_ASSIGN	SUCCESS	gestao@email.com encaminhou o ticket ID 37 para o utilizador ID 16	ticket	37	\N
307	2025-11-05 16:51:58.583172-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
308	2025-11-05 19:28:52.117506-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120251928-38 criado por dpo@email.com	ticket	38	\N
309	2025-11-05 19:38:17.470579-03	16	dpo@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120251938-41 criado por dpo@email.com	ticket	41	\N
310	2025-11-05 19:38:56.497305-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
311	2025-11-05 19:39:53.033455-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120251940-42 criado por marketing@email.com	ticket	42	\N
312	2025-11-05 19:40:26.375907-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
313	2025-11-05 19:41:02.934444-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120251941-43 criado por ti@rotatransportes.com.br	ticket	43	\N
314	2025-11-05 20:39:57.3808-03	\N	dpo2@email.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "dpo2@email.com" não encontrado.	\N	\N	\N
315	2025-11-05 21:03:40.119175-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
316	2025-11-05 21:05:24.368885-03	\N	dpo2@email.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "dpo2@email.com" não encontrado.	\N	\N	\N
317	2025-11-05 21:05:57.059856-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
318	2025-11-05 21:07:00.97038-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
319	2025-11-05 21:10:29.257657-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
320	2025-11-05 21:11:47.821138-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
321	2025-11-05 21:17:31.182422-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
322	2025-11-05 21:20:02.294548-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
323	2025-11-05 21:28:51.882088-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
324	2025-11-05 21:30:13.938385-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
325	2025-11-05 21:31:04.937758-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
326	2025-11-05 21:31:33.669054-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2131.1 criado por ti@rotatransportes.com.br	raffle	1	\N
327	2025-11-05 21:32:22.905995-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2132.2 criado por ti@rotatransportes.com.br	raffle	2	\N
328	2025-11-05 21:33:04.51802-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2133.3 criado por ti@rotatransportes.com.br	raffle	3	\N
329	2025-11-05 21:33:19.734379-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2133.4 criado por ti@rotatransportes.com.br	raffle	4	\N
330	2025-11-05 21:34:03.330027-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2134.5 criado por ti@rotatransportes.com.br	raffle	5	\N
331	2025-11-05 21:34:49.616433-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2135.6 criado por ti@rotatransportes.com.br	raffle	6	\N
332	2025-11-05 21:35:49.819899-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
333	2025-11-05 21:38:34.460876-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
334	2025-11-05 21:43:00.712223-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	CAMPAIGN_CREATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" criou a campanha "Campanha de Fim de Ano ".	campaign	10	\N
335	2025-11-05 21:45:23.337865-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
336	2025-11-05 21:50:14.340358-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
337	2025-11-05 21:50:35.845976-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2150.7 criado por ti@rotatransportes.com.br	raffle	7	\N
338	2025-11-05 22:03:37.406592-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120252203-44 criado por ti@rotatransportes.com.br	ticket	44	\N
339	2025-11-05 22:03:39.575183-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120252203-45 criado por ti@rotatransportes.com.br	ticket	45	\N
340	2025-11-05 22:04:36.521823-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
341	2025-11-05 22:05:00.783091-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
342	2025-11-05 22:12:08.865243-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
343	2025-11-05 22:12:48.623253-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 4 alterações processadas.	permissions	\N	{"changes": [{"role": "estetica", "checked": true, "permission": "raffles.update"}, {"role": "estetica", "checked": true, "permission": "raffles.create"}, {"role": "estetica", "checked": true, "permission": "raffles.read"}, {"role": "estetica", "checked": true, "permission": "raffles.draw"}]}
344	2025-11-05 22:13:07.519924-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
345	2025-11-05 22:14:16.747746-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2214.8 criado por marketing@email.com	raffle	8	\N
346	2025-11-05 22:24:15.179232-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2224.9 criado por marketing@email.com	raffle	9	\N
347	2025-11-05 22:41:54.211364-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2224.9 realizado por marketing@email.com. Vencedor: lucas.barros@email.com	raffle	9	\N
348	2025-11-05 22:42:41.481283-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2214.8 realizado por marketing@email.com. Vencedor: maria.silva@email.com	raffle	8	\N
349	2025-11-05 22:43:30.113597-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2150.7 realizado por marketing@email.com. Vencedor: murilo.prado@email.com	raffle	7	\N
350	2025-11-05 23:04:05.4389-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2304.10 criado por marketing@email.com	raffle	10	\N
351	2025-11-05 23:04:16.52219-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2304.10 realizado por marketing@email.com. Vencedor: amanda.freitas@email.com	raffle	10	\N
352	2025-11-05 23:25:07.125595-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2135.6 realizado por marketing@email.com. Vencedor: segundoemail@email.com	raffle	6	\N
353	2025-11-05 23:28:01.219204-03	20	marketing@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #051120252328-46 criado por marketing@email.com	ticket	46	\N
354	2025-11-05 23:29:41.587734-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2330.11 criado por marketing@email.com	raffle	11	\N
355	2025-11-05 23:29:52.07185-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2330.11 realizado por marketing@email.com. Vencedor: flavia.nogueira@email.com	raffle	11	\N
356	2025-11-05 23:30:24.378698-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2330.12 criado por marketing@email.com	raffle	12	\N
357	2025-11-05 23:30:46.788805-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2330.12 realizado por marketing@email.com. Vencedor: tiago.silveira@email.com	raffle	12	\N
358	2025-11-05 23:32:08.231526-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2332.13 criado por marketing@email.com	raffle	13	\N
359	2025-11-05 23:32:17.845051-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2332.13 realizado por marketing@email.com. Vencedor: murilo.prado@email.com	raffle	13	\N
360	2025-11-05 23:35:53.856721-03	20	marketing@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
361	2025-11-05 23:36:19.844608-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #051125-2336.14 criado por marketing@email.com	raffle	14	\N
362	2025-11-05 23:36:43.305054-03	20	marketing@email.com	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #051125-2336.14 realizado por marketing@email.com. Vencedor: amanda.freitas@email.com	raffle	14	\N
363	2025-11-06 16:05:25.829283-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
364	2025-11-06 16:06:14.746167-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
365	2025-11-06 16:09:11.954221-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
366	2025-11-06 16:09:58.299471-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
367	2025-11-06 16:10:22.071557-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
368	2025-11-06 16:10:40.44131-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
369	2025-11-06 16:11:00.446615-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
370	2025-11-06 16:12:52.047206-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
371	2025-11-06 16:13:18.419354-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
372	2025-11-06 16:24:07.005722-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
373	2025-11-06 16:26:18.579188-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	BANNER_CREATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" criou o banner "Banner de Boas Festas".	banner	13	\N
374	2025-11-06 16:27:48.533052-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	CAMPAIGN_CREATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" criou a campanha "Campanha de Fim de Ano 2".	campaign	11	\N
375	2025-11-06 16:28:33.530128-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_CREATE	SUCCESS	Sorteio #061125-1628.15 criado por ti@rotatransportes.com.br	raffle	15	\N
376	2025-11-06 16:28:44.507583-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	RAFFLE_DRAW	SUCCESS	Sorteio #061125-1628.15 realizado por ti@rotatransportes.com.br. Vencedor: marcos.teixeira@email.com	raffle	15	\N
377	2025-11-06 16:30:18.148256-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	ROUTER_UPDATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou o roteador "RT-000002".	router	2	\N
378	2025-11-06 16:30:57.360353-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	ROUTER_UPDATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou o roteador "RT-000002".	router	2	\N
379	2025-11-06 16:32:52.324995-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
380	2025-11-06 19:47:28.283288-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
381	2025-11-06 20:05:04.771742-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
382	2025-11-06 20:08:36.7417-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
383	2025-11-06 20:13:04.416725-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
384	2025-11-06 20:16:15.509886-03	19	nti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "nti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
385	2025-11-06 20:16:53.123205-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
386	2025-11-06 20:34:29.012476-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
387	2025-11-06 20:59:20.667729-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
388	2025-11-06 21:00:55.421514-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
389	2025-11-06 21:01:41.320127-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
390	2025-11-06 21:02:43.776098-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
391	2025-11-06 21:03:23.770564-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
392	2025-11-06 21:10:25.754464-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
393	2025-11-06 21:11:58.314814-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
394	2025-11-06 21:12:36.179602-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
395	2025-11-06 21:13:28.371087-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
396	2025-11-06 21:14:34.760605-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
397	2025-11-06 21:14:49.73984-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
398	2025-11-06 21:15:07.281336-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
399	2025-11-06 21:42:58.364026-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
400	2025-11-06 21:43:36.837116-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
401	2025-11-06 21:45:52.434598-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_LOGIN_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a aparência da página de login.	settings	\N	\N
402	2025-11-06 21:46:07.826961-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
403	2025-11-06 22:13:41.673462-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
404	2025-11-06 22:31:53.385488-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
405	2025-11-06 22:35:53.781982-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
406	2025-11-06 22:38:52.352774-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
407	2025-11-06 22:56:04.419689-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
408	2025-11-07 19:08:28.181665-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
409	2025-11-07 19:32:04.501053-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
410	2025-11-07 20:08:04.689423-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_BACKGROUND	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a imagem de fundo.	settings	\N	\N
411	2025-11-07 20:08:21.414736-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
412	2025-11-07 20:08:39.795405-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_BACKGROUND	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a imagem de fundo.	settings	\N	\N
413	2025-11-07 20:08:53.810165-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
414	2025-11-07 20:34:31.335108-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
415	2025-11-07 20:48:43.667906-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
416	2025-11-07 20:48:58.813535-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
417	2025-11-07 20:49:18.094794-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE_FAILURE	FAILURE	Falha ao atualizar aparência. Erro: multiple assignments to same column "login_background_color"	\N	\N	\N
418	2025-11-07 20:49:34.0808-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE_FAILURE	FAILURE	Falha ao atualizar aparência. Erro: multiple assignments to same column "login_background_color"	\N	\N	\N
419	2025-11-07 20:50:20.703573-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE_FAILURE	FAILURE	Falha ao atualizar aparência. Erro: multiple assignments to same column "login_background_color"	\N	\N	\N
420	2025-11-07 20:53:12.966105-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
421	2025-11-07 20:53:26.075974-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
422	2025-11-07 20:57:19.511824-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
423	2025-11-07 20:57:41.897582-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
424	2025-11-07 20:58:40.138547-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
425	2025-11-07 20:58:59.356089-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
426	2025-11-07 21:00:04.091411-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
427	2025-11-07 21:04:19.978665-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
428	2025-11-07 21:04:41.706101-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
429	2025-11-07 21:05:01.39334-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
430	2025-11-07 21:05:48.211271-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
431	2025-11-07 21:06:06.08036-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
432	2025-11-07 21:06:26.236944-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
433	2025-11-07 21:06:46.638881-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
434	2025-11-07 21:17:19.753214-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
435	2025-11-07 21:17:38.035259-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
436	2025-11-07 21:18:14.218465-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
437	2025-11-07 21:18:29.418534-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
438	2025-11-07 21:30:15.681153-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
439	2025-11-07 21:30:34.332519-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
440	2025-11-07 21:30:55.035269-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
441	2025-11-07 21:31:11.6127-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
442	2025-11-07 21:46:22.349197-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
443	2025-11-07 21:46:43.896819-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
444	2025-11-07 21:47:36.172298-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
445	2025-11-07 21:48:14.153171-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
446	2025-11-07 21:56:27.96539-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
447	2025-11-07 21:59:16.663001-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
448	2025-11-07 22:03:20.622901-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
449	2025-11-07 22:04:22.939766-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
450	2025-11-07 22:04:45.723857-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
451	2025-11-07 22:05:12.419812-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
452	2025-11-07 22:06:22.413823-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
453	2025-11-07 22:28:57.764738-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
454	2025-11-07 22:29:15.141319-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
455	2025-11-07 22:29:59.616969-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
456	2025-11-07 22:30:31.919736-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
457	2025-11-07 22:30:52.832412-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
458	2025-11-07 22:31:35.850462-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
459	2025-11-07 22:34:14.598069-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
460	2025-11-07 22:35:03.416275-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
461	2025-11-07 22:35:31.77958-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
462	2025-11-07 22:36:51.577198-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
463	2025-11-07 22:37:05.727299-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
464	2025-11-07 22:37:21.312941-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
465	2025-11-07 22:38:13.601993-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
466	2025-11-07 22:38:26.988272-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
467	2025-11-07 22:39:41.858132-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
468	2025-11-07 22:40:01.823245-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
469	2025-11-07 22:41:30.910255-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
470	2025-11-07 22:42:13.758932-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
471	2025-11-07 22:45:14.349393-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
472	2025-11-07 23:00:00.898938-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
473	2025-11-07 23:00:23.745957-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
474	2025-11-07 23:00:57.490777-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
475	2025-11-07 23:24:41.295646-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
476	2025-11-07 23:25:57.802831-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
477	2025-11-07 23:56:58.119816-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
478	2025-11-07 23:58:37.563597-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
479	2025-11-08 00:01:41.532942-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
480	2025-11-08 00:02:03.363324-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
481	2025-11-08 00:02:16.510638-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
482	2025-11-08 00:02:53.470482-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
483	2025-11-08 00:03:18.94562-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
484	2025-11-08 00:04:49.597422-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
485	2025-11-08 00:06:42.047547-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
486	2025-11-08 00:08:32.801806-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
487	2025-11-08 00:09:01.955652-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
488	2025-11-08 00:15:52.964949-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
489	2025-11-08 00:16:04.4576-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
490	2025-11-08 00:16:44.803329-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
491	2025-11-08 00:16:56.833204-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
492	2025-11-08 00:17:09.115962-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
493	2025-11-08 00:22:44.415237-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
494	2025-11-08 00:23:14.01935-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
495	2025-11-08 00:23:55.957511-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
496	2025-11-08 00:24:07.743668-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
497	2025-11-08 00:24:27.162486-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
498	2025-11-08 00:24:48.474615-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
499	2025-11-08 00:25:47.499831-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
500	2025-11-08 00:26:06.614867-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
501	2025-11-08 00:26:32.438004-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
502	2025-11-08 00:27:41.519119-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
503	2025-11-08 00:35:07.286664-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
504	2025-11-08 00:35:26.376684-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
586	2025-11-09 00:06:39.161431-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
505	2025-11-08 00:36:23.26687-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
506	2025-11-08 00:37:58.338611-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
507	2025-11-08 00:38:52.160236-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
508	2025-11-08 00:39:11.973361-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
509	2025-11-08 00:40:04.388587-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
510	2025-11-08 00:40:36.00865-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
511	2025-11-08 00:41:12.247779-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
512	2025-11-08 00:41:30.49514-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
513	2025-11-08 00:43:27.129394-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
514	2025-11-08 00:45:40.025692-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
515	2025-11-08 01:06:48.507658-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
516	2025-11-08 01:12:08.478607-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
517	2025-11-08 01:12:42.117684-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_BACKGROUND	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a imagem de fundo.	settings	\N	\N
518	2025-11-08 01:12:56.566735-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
519	2025-11-08 01:48:39.127847-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
520	2025-11-08 01:50:34.407562-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
521	2025-11-08 02:03:36.32459-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
522	2025-11-08 02:04:53.709418-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
523	2025-11-08 02:05:13.957879-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_BACKGROUND	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou a imagem de fundo.	settings	\N	\N
524	2025-11-08 02:05:42.311287-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
525	2025-11-08 02:06:05.959471-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_GENERAL	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações gerais.	settings	\N	\N
526	2025-11-08 19:12:19.290566-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
527	2025-11-08 20:00:46.20915-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
528	2025-11-08 20:02:48.608778-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
529	2025-11-08 20:07:43.714169-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
530	2025-11-08 20:18:58.594049-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
531	2025-11-08 20:28:21.73117-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
532	2025-11-08 20:38:34.829558-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
533	2025-11-08 20:39:01.885882-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
534	2025-11-08 20:39:20.814147-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
535	2025-11-08 20:39:33.289229-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
536	2025-11-08 20:40:05.103261-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
537	2025-11-08 20:40:21.470703-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
538	2025-11-08 20:46:56.455104-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
539	2025-11-08 20:51:30.912869-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
540	2025-11-08 20:52:54.715386-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
541	2025-11-08 20:55:58.907722-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
542	2025-11-08 21:08:29.767576-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
543	2025-11-08 21:08:50.920145-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
544	2025-11-08 21:09:12.610292-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
545	2025-11-08 21:09:28.690521-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	SETTINGS_UPDATE_APPEARANCE	SUCCESS	Utilizador "ti@rotatransportes.com.br" atualizou as configurações de aparência.	\N	\N	\N
546	2025-11-08 21:21:10.238446-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
547	2025-11-08 21:54:32.887672-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
548	2025-11-08 21:57:02.484839-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
549	2025-11-08 22:02:33.553346-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
550	2025-11-08 22:07:16.999615-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
551	2025-11-08 22:14:36.951181-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
552	2025-11-08 22:15:36.430106-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
553	2025-11-08 22:24:20.392495-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
554	2025-11-08 22:25:38.451213-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
555	2025-11-08 22:29:27.638201-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
556	2025-11-08 22:33:39.891547-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
557	2025-11-08 22:39:17.223948-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
558	2025-11-08 22:45:57.074486-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
559	2025-11-08 22:46:04.441313-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
560	2025-11-08 22:46:21.797578-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
561	2025-11-08 22:47:49.214178-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
562	2025-11-08 22:51:22.766877-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
563	2025-11-08 22:54:10.258403-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
564	2025-11-08 22:57:28.632702-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
565	2025-11-08 22:59:53.008264-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
566	2025-11-08 23:06:38.199578-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
567	2025-11-08 23:08:38.850645-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
568	2025-11-08 23:10:22.752375-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
569	2025-11-08 23:11:54.456328-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
570	2025-11-08 23:13:22.523947-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
571	2025-11-08 23:21:00.978004-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
572	2025-11-08 23:24:58.477422-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
573	2025-11-08 23:33:48.299116-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
574	2025-11-08 23:36:51.017446-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
575	2025-11-08 23:41:02.410481-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
576	2025-11-08 23:41:17.867109-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
577	2025-11-08 23:43:03.908871-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
578	2025-11-08 23:54:42.842492-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
579	2025-11-08 23:55:48.096438-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
580	2025-11-08 23:56:36.169126-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
581	2025-11-08 23:57:24.751933-03	21	gestao@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
582	2025-11-08 23:57:46.818696-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
583	2025-11-08 23:58:05.669095-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "gestao", "checked": true, "permission": "raffles.read"}]}
584	2025-11-08 23:58:13.626226-03	21	gestao@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
585	2025-11-09 00:03:39.716034-03	1	ti@rotatransportes.com.br	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
587	2025-11-09 00:08:38.517841-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
588	2025-11-09 00:17:31.994143-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
589	2025-11-09 00:21:26.639905-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
590	2025-11-09 00:22:54.186056-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
591	2025-11-09 00:23:42.665639-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
592	2025-11-09 00:24:16.129086-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
593	2025-11-09 00:29:24.357475-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
594	2025-11-09 00:32:56.661718-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
595	2025-11-09 19:03:34.01405-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
596	2025-11-09 19:04:10.56111-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
597	2025-11-09 19:04:27.34534-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
598	2025-11-09 19:04:44.950412-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
599	2025-11-09 19:04:53.538707-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
600	2025-11-09 19:07:27.75824-03	21	gestao@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "gestao@email.com" autenticado com sucesso.	\N	\N	\N
601	2025-11-09 19:08:30.983039-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #091120251908-47 criado por gestao@email.com	ticket	47	\N
602	2025-11-09 19:08:33.571416-03	21	gestao@email.com	::ffff:127.0.0.1	TICKET_CREATE	SUCCESS	Ticket #091120251908-48 criado por gestao@email.com	ticket	48	\N
603	2025-11-09 19:10:56.187732-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
604	2025-11-09 19:11:07.754503-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
605	2025-11-09 19:11:30.085882-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
606	2025-11-09 19:11:38.782478-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
607	2025-11-09 19:16:10.546781-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
608	2025-11-09 19:16:20.305948-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
609	2025-11-09 19:24:18.607912-03	\N	anapaula@e-mail.com	::ffff:127.0.0.1	LOGIN_FAILURE	FAILURE	Tentativa de login falhou: utilizador "anapaula@e-mail.com" não encontrado.	\N	\N	\N
610	2025-11-09 19:27:50.48723-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
611	2025-11-09 19:50:21.904953-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
612	2025-11-09 19:51:06.902579-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	USER_CREATE	SUCCESS	Utilizador "ti@rotatransportes.com.br" criou o novo utilizador "son.magometal@gmail.com" (ID: 22).	user	22	\N
613	2025-11-09 19:57:03.984806-03	22	son.magometal@gmail.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "son.magometal@gmail.com" autenticado com sucesso.	\N	\N	\N
614	2025-11-09 20:08:04.490295-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
615	2025-11-09 22:20:22.836163-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
616	2025-11-09 22:31:16.456317-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
617	2025-11-09 22:42:57.620817-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 48	ticket	48	\N
618	2025-11-09 22:42:58.616716-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 48	ticket	48	\N
619	2025-11-09 22:42:59.652371-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 48	ticket	48	\N
620	2025-11-09 22:43:27.320205-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 48	ticket	48	\N
621	2025-11-09 22:44:06.661026-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 48	ticket	48	\N
622	2025-11-09 22:44:43.496962-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 48	ticket	48	\N
623	2025-11-09 22:48:33.964933-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
624	2025-11-09 22:56:49.697597-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	TICKET_REPLY	SUCCESS	ti@rotatransportes.com.br respondeu ao ticket ID 48	ticket	48	\N
625	2025-11-09 23:01:43.82106-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "banners.read"}]}
626	2025-11-09 23:05:27.341744-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "banners.read"}]}
627	2025-11-09 23:06:08.340216-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": true, "permission": "banners.delete"}]}
628	2025-11-09 23:07:50.099438-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "banners.read"}]}
629	2025-11-09 23:08:00.715535-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
630	2025-11-09 23:08:38.45844-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
631	2025-11-09 23:08:54.561446-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": true, "permission": "banners.delete"}]}
632	2025-11-09 23:10:36.723531-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
633	2025-11-09 23:13:20.752365-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
634	2025-11-09 23:13:28.438413-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "banners.read"}]}
635	2025-11-09 23:13:43.506727-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
636	2025-11-09 23:16:58.075987-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
637	2025-11-09 23:17:06.632599-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "banners.read"}]}
638	2025-11-09 23:17:11.922433-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
639	2025-11-09 23:17:36.99008-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
640	2025-11-09 23:17:48.083354-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "banners.read"}]}
641	2025-11-09 23:18:36.501673-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
642	2025-11-09 23:21:11.109856-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": false, "permission": "banners.read"}]}
643	2025-11-09 23:21:21.376038-03	16	dpo@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
644	2025-11-09 23:22:20.243218-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 4 alterações processadas.	permissions	\N	{"changes": [{"role": "estetica", "checked": false, "permission": "banners.update"}, {"role": "estetica", "checked": false, "permission": "banners.create"}, {"role": "estetica", "checked": false, "permission": "banners.delete"}, {"role": "estetica", "checked": false, "permission": "banners.read"}]}
645	2025-11-09 23:23:31.831245-03	20	marketing@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
646	2025-11-09 23:23:58.761795-03	20	marketing@email.com	::ffff:172.16.12.239	CAMPAIGN_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou a campanha "Campanha de Fim de Ano 2 e meio".	campaign	8	\N
647	2025-11-09 23:24:07.796976-03	20	marketing@email.com	::ffff:172.16.12.239	CAMPAIGN_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou a campanha "Campanha de Fim de Ano ".	campaign	10	\N
648	2025-11-09 23:24:25.479994-03	20	marketing@email.com	::ffff:172.16.12.239	TEMPLATE_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou o template "Template GB".	template	7	\N
649	2025-11-09 23:26:49.967839-03	16	dpo@email.com	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "dpo@email.com" autenticado com sucesso.	\N	\N	\N
650	2025-11-09 23:27:45.539013-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	LOGIN_SUCCESS	SUCCESS	Utilizador "ti@rotatransportes.com.br" autenticado com sucesso.	\N	\N	\N
651	2025-11-09 23:29:01.648496-03	20	marketing@email.com	::ffff:172.16.12.239	LOGIN_SUCCESS	SUCCESS	Utilizador "marketing@email.com" autenticado com sucesso.	\N	\N	\N
652	2025-11-09 23:29:39.589277-03	20	marketing@email.com	::ffff:172.16.12.239	TEMPLATE_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou o template "Template GB 3".	template	7	\N
653	2025-11-09 23:30:28.161491-03	20	marketing@email.com	::ffff:172.16.12.239	RAFFLE_CREATE	SUCCESS	Sorteio #091125-2330.16 criado por marketing@email.com	raffle	16	\N
654	2025-11-09 23:30:34.331299-03	20	marketing@email.com	::ffff:172.16.12.239	RAFFLE_DRAW	SUCCESS	Sorteio #091125-2330.16 realizado por marketing@email.com. Vencedor: valeria.paz@email.com	raffle	16	\N
655	2025-11-09 23:31:39.656763-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 1 alterações processadas.	permissions	\N	{"changes": [{"role": "DPO", "checked": true, "permission": "banners.read"}]}
656	2025-11-09 23:32:52.362054-03	1	ti@rotatransportes.com.br	::ffff:127.0.0.1	PERMISSIONS_UPDATE	SUCCESS	O utilizador "ti@rotatransportes.com.br" atualizou as permissões. 5 alterações processadas.	permissions	\N	{"changes": [{"role": "estetica", "checked": true, "permission": "banners.update"}, {"role": "estetica", "checked": true, "permission": "banners.create"}, {"role": "estetica", "checked": true, "permission": "banners.delete"}, {"role": "estetica", "checked": true, "permission": "banners.read"}, {"role": "estetica", "checked": false, "permission": "settings.read"}]}
657	2025-11-09 23:33:14.59615-03	20	marketing@email.com	::ffff:172.16.12.239	BANNER_UPDATE	SUCCESS	Utilizador "marketing@email.com" atualizou o banner "Banner de Boas Festas".	banner	13	\N
\.


--
-- Data for Name: authorized_domains; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.authorized_domains (id, domain_name) FROM stdin;
1	@rotatransportes.com.br
2	@cidadesol.com.br
3	@grupobrasileiro.com.br
\.


--
-- Data for Name: banners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.banners (id, type, image_url, display_time_seconds, is_active, name, target_url) FROM stdin;
11	pre-login	/uploads/banners/banner-1762066966656-102334441.png	5	t	Banner de Boas Festas	
5	post-login	/uploads/banners/banner-1761430371957-425263557.png	3	t	Grupo Brasileiro 2025	
13	post-login	/uploads/banners/banner-1762457186958-355789971.png	5	t	Banner de Boas Festas	
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaigns (id, name, template_id, target_type, target_id, start_date, end_date, is_active) FROM stdin;
11	Campanha de Fim de Ano 2	7	single_router	1	2025-11-06	2025-11-13	t
8	Campanha de Fim de Ano 2 e meio	7	single_router	9	2025-11-08	2025-11-23	f
10	Campanha de Fim de Ano 	7	group	17	2025-11-05	2025-11-19	f
\.


--
-- Data for Name: data_exclusion_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.data_exclusion_requests (id, user_email, request_date, status, completed_by_user_id, completion_date) FROM stdin;
1	nti@rotatransportes.com.br	2025-11-03 19:41:46.296662-03	completed	16	2025-11-03 20:15:18.363797-03
2	fulano@email.com	2025-11-03 20:05:51.54289-03	completed	16	2025-11-03 20:15:26.37896-03
3	usuariopadrao@email.com	2025-11-03 20:05:58.039144-03	completed	16	2025-11-03 21:47:41.720478-03
4	gestao@email.com	2025-11-03 20:06:07.534304-03	completed	16	2025-11-03 21:48:26.650501-03
5	anapaula@e-mail.com	2025-11-03 20:06:14.824004-03	completed	16	2025-11-03 22:16:48.819768-03
6	emailqueutlizeinohotspot@email.com	2025-11-09 20:12:11.68097-03	pending	\N	\N
\.


--
-- Data for Name: nas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nas (id, nasname, shortname, type, ports, secret, server, community, description) FROM stdin;
\.


--
-- Data for Name: nasreload; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nasreload (nasipaddress, reloadtime) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: radius
--

COPY public.notifications (id, user_id, type, related_ticket_id, message, is_read, created_at) FROM stdin;
29	16	new_ticket	30	Novo ticket #041120252104-30 criado por marketing@email.com	t	2025-11-04 21:04:20.039766-03
34	20	new_message	30	Nova resposta no ticket #041120252104-30 de dpo@email.com	t	2025-11-04 21:05:17.695931-03
38	16	new_ticket	31	Novo ticket #041120252128-31 criado por marketing@email.com	f	2025-11-04 21:28:00.17769-03
39	19	new_ticket	31	Novo ticket #041120252128-31 criado por marketing@email.com	f	2025-11-04 21:28:00.17769-03
40	21	new_ticket	31	Novo ticket #041120252128-31 criado por marketing@email.com	t	2025-11-04 21:28:00.17769-03
10	21	new_ticket	23	Novo ticket #041120252000-23 criado por gestao@email.com	t	2025-11-04 19:59:47.852533-03
1	21	new_ticket	18	Novo ticket #041120251912-18 criado por marketing@email.com	t	2025-11-04 19:12:40.523848-03
2	21	new_ticket	19	Novo ticket #041120251915-19 criado por dpo@email.com	t	2025-11-04 19:14:54.342291-03
42	16	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:06.371748-03
43	19	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:06.371748-03
44	21	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:06.371748-03
46	16	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:11.846958-03
47	19	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:11.846958-03
12	19	ticket_assigned	20	O ticket #041120251918-20 foi encaminhado para você por ti@rotatransportes.com.br	f	2025-11-04 20:42:28.535798-03
14	19	ticket_assigned	20	O ticket #041120251918-20 foi encaminhado para você por ti@rotatransportes.com.br	f	2025-11-04 20:43:42.686189-03
15	16	new_message	22	Nova resposta no ticket #041120251931-22 de gestao@email.com	f	2025-11-04 20:44:15.690481-03
16	16	new_ticket	27	Novo ticket #041120252046-27 criado por marketing@email.com	f	2025-11-04 20:45:51.565244-03
17	19	new_ticket	27	Novo ticket #041120252046-27 criado por marketing@email.com	f	2025-11-04 20:45:51.565244-03
58	16	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:19.412498-03
20	16	new_ticket	28	Novo ticket #041120252052-28 criado por ti@rotatransportes.com.br	f	2025-11-04 20:52:13.358877-03
21	19	new_ticket	28	Novo ticket #041120252052-28 criado por ti@rotatransportes.com.br	f	2025-11-04 20:52:13.358877-03
48	21	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:11.846958-03
24	16	new_ticket	29	Novo ticket #041120252056-29 criado por ti@rotatransportes.com.br	f	2025-11-04 20:56:01.517438-03
25	19	new_ticket	29	Novo ticket #041120252056-29 criado por ti@rotatransportes.com.br	f	2025-11-04 20:56:01.517438-03
28	16	ticket_assigned	29	O ticket #041120252056-29 foi encaminhado para você por gestao@email.com	t	2025-11-04 20:59:12.121441-03
30	19	new_ticket	30	Novo ticket #041120252104-30 criado por marketing@email.com	f	2025-11-04 21:04:20.039766-03
3	21	new_ticket	20	Novo ticket #041120251918-20 criado por marketing@email.com	t	2025-11-04 19:17:51.350024-03
4	21	new_ticket	21	Novo ticket #041120251927-21 criado por marketing@email.com	t	2025-11-04 19:27:18.88879-03
5	21	new_message	18	Nova resposta no ticket #041120251912-18	t	2025-11-04 19:30:37.640245-03
6	21	new_message	21	Nova resposta no ticket #041120251927-21	t	2025-11-04 19:30:50.837636-03
7	21	new_message	20	Nova resposta no ticket #041120251918-20	t	2025-11-04 19:30:57.286782-03
8	21	new_ticket	22	Novo ticket #041120251931-22 criado por dpo@email.com	t	2025-11-04 19:31:40.783602-03
9	21	new_message	20	Nova resposta no ticket #041120251918-20	t	2025-11-04 19:33:45.165-03
11	21	new_ticket	24	Novo ticket #041120252001-24 criado por marketing@email.com	t	2025-11-04 20:00:53.590078-03
13	21	ticket_assigned	21	O ticket #041120251927-21 foi encaminhado para você por ti@rotatransportes.com.br	t	2025-11-04 20:43:10.654466-03
33	16	ticket_assigned	30	O ticket #041120252104-30 foi encaminhado para você por gestao@email.com	t	2025-11-04 21:04:51.477916-03
35	19	new_message	30	Nova resposta no ticket #041120252104-30 de dpo@email.com	f	2025-11-04 21:05:17.695931-03
18	21	new_ticket	27	Novo ticket #041120252046-27 criado por marketing@email.com	t	2025-11-04 20:45:51.565244-03
22	21	new_ticket	28	Novo ticket #041120252052-28 criado por ti@rotatransportes.com.br	t	2025-11-04 20:52:13.358877-03
23	21	ticket_assigned	28	O ticket #041120252052-28 foi encaminhado para você por ti@rotatransportes.com.br	t	2025-11-04 20:52:18.42586-03
26	21	new_ticket	29	Novo ticket #041120252056-29 criado por ti@rotatransportes.com.br	t	2025-11-04 20:56:01.517438-03
31	21	new_ticket	30	Novo ticket #041120252104-30 criado por marketing@email.com	t	2025-11-04 21:04:20.039766-03
36	21	new_message	30	Nova resposta no ticket #041120252104-30 de dpo@email.com	t	2025-11-04 21:05:17.695931-03
50	16	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:14.72306-03
51	19	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:14.72306-03
52	21	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:14.72306-03
55	19	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:17.189655-03
56	21	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:17.189655-03
59	19	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:19.412498-03
60	21	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:19.412498-03
62	16	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:22.245464-03
41	1	new_ticket	31	Novo ticket #041120252128-31 criado por marketing@email.com	t	2025-11-04 21:28:00.17769-03
63	19	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:22.245464-03
64	21	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:22.245464-03
66	16	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:26.711009-03
67	19	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:26.711009-03
68	21	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	f	2025-11-04 21:45:26.711009-03
70	16	ticket_assigned	31	O ticket #041120252128-31 foi encaminhado para você por ti@rotatransportes.com.br	t	2025-11-04 21:47:47.973703-03
71	19	new_ticket	32	Novo ticket #041120252211-32 criado por dpo@email.com	f	2025-11-04 22:10:44.425497-03
72	21	new_ticket	32	Novo ticket #041120252211-32 criado por dpo@email.com	f	2025-11-04 22:10:44.425497-03
74	19	new_ticket	33	Novo ticket #041120252211-33 criado por dpo@email.com	f	2025-11-04 22:10:48.523978-03
75	21	new_ticket	33	Novo ticket #041120252211-33 criado por dpo@email.com	f	2025-11-04 22:10:48.523978-03
77	19	new_ticket	34	Novo ticket #041120252211-34 criado por dpo@email.com	f	2025-11-04 22:10:53.286016-03
78	21	new_ticket	34	Novo ticket #041120252211-34 criado por dpo@email.com	f	2025-11-04 22:10:53.286016-03
80	19	new_ticket	35	Novo ticket #041120252211-35 criado por dpo@email.com	f	2025-11-04 22:10:57.558823-03
81	21	new_ticket	35	Novo ticket #041120252211-35 criado por dpo@email.com	f	2025-11-04 22:10:57.558823-03
83	19	new_ticket	36	Novo ticket #041120252211-36 criado por dpo@email.com	f	2025-11-04 22:11:02.388479-03
86	16	new_message	36	Nova resposta no ticket #041120252211-36 de ti@rotatransportes.com.br	f	2025-11-04 23:08:28.670963-03
54	16	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:17.189655-03
84	21	new_ticket	36	Novo ticket #041120252211-36 criado por dpo@email.com	t	2025-11-04 22:11:02.388479-03
87	16	new_message	35	Nova resposta no ticket #041120252211-35 de gestao@email.com	f	2025-11-05 15:26:52.74014-03
88	16	new_message	35	Nova resposta no ticket #041120252211-35 de gestao@email.com	f	2025-11-05 16:43:09.353868-03
89	16	new_message	36	Nova resposta no ticket #041120252211-36 de gestao@email.com	f	2025-11-05 16:49:57.489015-03
90	16	new_ticket	37	Novo ticket #051120251651-37 criado por marketing@email.com	f	2025-11-05 16:51:05.252408-03
91	19	new_ticket	37	Novo ticket #051120251651-37 criado por marketing@email.com	f	2025-11-05 16:51:05.252408-03
92	21	new_ticket	37	Novo ticket #051120251651-37 criado por marketing@email.com	t	2025-11-05 16:51:05.252408-03
94	16	ticket_assigned	37	O ticket #051120251651-37 foi encaminhado para você por gestao@email.com	t	2025-11-05 16:51:47.350135-03
95	19	new_ticket	38	Novo ticket #051120251928-38 criado por dpo@email.com	f	2025-11-05 19:28:46.352841-03
96	21	new_ticket	38	Novo ticket #051120251928-38 criado por dpo@email.com	f	2025-11-05 19:28:46.352841-03
100	19	new_ticket	41	Novo ticket #051120251938-41 criado por dpo@email.com	f	2025-11-05 19:38:14.193841-03
101	21	new_ticket	41	Novo ticket #051120251938-41 criado por dpo@email.com	f	2025-11-05 19:38:14.193841-03
103	16	new_ticket	42	Novo ticket #051120251940-42 criado por marketing@email.com	f	2025-11-05 19:39:47.382301-03
104	19	new_ticket	42	Novo ticket #051120251940-42 criado por marketing@email.com	f	2025-11-05 19:39:47.382301-03
105	21	new_ticket	42	Novo ticket #051120251940-42 criado por marketing@email.com	f	2025-11-05 19:39:47.382301-03
107	16	new_ticket	43	Novo ticket #051120251941-43 criado por ti@rotatransportes.com.br	f	2025-11-05 19:40:59.834184-03
108	19	new_ticket	43	Novo ticket #051120251941-43 criado por ti@rotatransportes.com.br	f	2025-11-05 19:40:59.834184-03
109	21	new_ticket	43	Novo ticket #051120251941-43 criado por ti@rotatransportes.com.br	f	2025-11-05 19:40:59.834184-03
110	16	new_ticket	44	Novo ticket #051120252203-44 criado por ti@rotatransportes.com.br	f	2025-11-05 22:02:33.779581-03
111	19	new_ticket	44	Novo ticket #051120252203-44 criado por ti@rotatransportes.com.br	f	2025-11-05 22:02:33.779581-03
112	21	new_ticket	44	Novo ticket #051120252203-44 criado por ti@rotatransportes.com.br	f	2025-11-05 22:02:33.779581-03
113	16	new_ticket	45	Novo ticket #051120252203-45 criado por ti@rotatransportes.com.br	f	2025-11-05 22:03:35.353198-03
114	19	new_ticket	45	Novo ticket #051120252203-45 criado por ti@rotatransportes.com.br	f	2025-11-05 22:03:35.353198-03
115	21	new_ticket	45	Novo ticket #051120252203-45 criado por ti@rotatransportes.com.br	f	2025-11-05 22:03:35.353198-03
116	16	new_ticket	46	Novo ticket #051120252328-46 criado por marketing@email.com	f	2025-11-05 23:27:47.850254-03
117	19	new_ticket	46	Novo ticket #051120252328-46 criado por marketing@email.com	f	2025-11-05 23:27:47.850254-03
118	21	new_ticket	46	Novo ticket #051120252328-46 criado por marketing@email.com	f	2025-11-05 23:27:47.850254-03
19	1	new_ticket	27	Novo ticket #041120252046-27 criado por marketing@email.com	t	2025-11-04 20:45:51.565244-03
27	1	new_message	29	Nova resposta no ticket #041120252056-29 de gestao@email.com	t	2025-11-04 20:58:59.790732-03
32	1	new_ticket	30	Novo ticket #041120252104-30 criado por marketing@email.com	t	2025-11-04 21:04:20.039766-03
37	1	new_message	30	Nova resposta no ticket #041120252104-30 de dpo@email.com	t	2025-11-04 21:05:17.695931-03
45	1	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:06.371748-03
49	1	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:11.846958-03
53	1	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:14.72306-03
57	1	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:17.189655-03
61	1	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:19.412498-03
65	1	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:22.245464-03
69	1	new_message	31	Nova resposta no ticket #041120252128-31 de marketing@email.com	t	2025-11-04 21:45:26.711009-03
73	1	new_ticket	32	Novo ticket #041120252211-32 criado por dpo@email.com	t	2025-11-04 22:10:44.425497-03
76	1	new_ticket	33	Novo ticket #041120252211-33 criado por dpo@email.com	t	2025-11-04 22:10:48.523978-03
79	1	new_ticket	34	Novo ticket #041120252211-34 criado por dpo@email.com	t	2025-11-04 22:10:53.286016-03
82	1	new_ticket	35	Novo ticket #041120252211-35 criado por dpo@email.com	t	2025-11-04 22:10:57.558823-03
85	1	new_ticket	36	Novo ticket #041120252211-36 criado por dpo@email.com	t	2025-11-04 22:11:02.388479-03
93	1	new_ticket	37	Novo ticket #051120251651-37 criado por marketing@email.com	t	2025-11-05 16:51:05.252408-03
97	1	new_ticket	38	Novo ticket #051120251928-38 criado por dpo@email.com	t	2025-11-05 19:28:46.352841-03
102	1	new_ticket	41	Novo ticket #051120251938-41 criado por dpo@email.com	t	2025-11-05 19:38:14.193841-03
106	1	new_ticket	42	Novo ticket #051120251940-42 criado por marketing@email.com	t	2025-11-05 19:39:47.382301-03
119	1	new_ticket	46	Novo ticket #051120252328-46 criado por marketing@email.com	t	2025-11-05 23:27:47.850254-03
120	16	new_ticket	47	Novo ticket #091120251908-47 criado por gestao@email.com	f	2025-11-09 19:08:22.374043-03
121	19	new_ticket	47	Novo ticket #091120251908-47 criado por gestao@email.com	f	2025-11-09 19:08:22.374043-03
122	1	new_ticket	47	Novo ticket #091120251908-47 criado por gestao@email.com	f	2025-11-09 19:08:22.374043-03
123	16	new_ticket	48	Novo ticket #091120251908-48 criado por gestao@email.com	f	2025-11-09 19:08:30.846847-03
124	19	new_ticket	48	Novo ticket #091120251908-48 criado por gestao@email.com	f	2025-11-09 19:08:30.846847-03
125	1	new_ticket	48	Novo ticket #091120251908-48 criado por gestao@email.com	f	2025-11-09 19:08:30.846847-03
126	21	new_message	48	Nova resposta no ticket #091120251908-48 de ti@rotatransportes.com.br	f	2025-11-09 22:42:43.146471-03
127	21	new_message	48	Nova resposta no ticket #091120251908-48 de ti@rotatransportes.com.br	f	2025-11-09 22:42:54.843734-03
128	21	new_message	48	Nova resposta no ticket #091120251908-48 de ti@rotatransportes.com.br	f	2025-11-09 22:42:45.212067-03
129	21	new_message	48	Nova resposta no ticket #091120251908-48 de ti@rotatransportes.com.br	f	2025-11-09 22:43:26.263733-03
130	21	new_message	48	Nova resposta no ticket #091120251908-48 de ti@rotatransportes.com.br	f	2025-11-09 22:44:05.099647-03
131	21	new_message	48	Nova resposta no ticket #091120251908-48 de ti@rotatransportes.com.br	f	2025-11-09 22:44:42.246152-03
132	21	new_message	48	Nova resposta no ticket #091120251908-48 de ti@rotatransportes.com.br	f	2025-11-09 22:56:44.533373-03
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (permission_key, feature_name, action_name, description) FROM stdin;
dashboard.cards.read	Dashboard Cards	Visualizar	Permite ver os cards no dashboard
dashboard.cards.create	Dashboard Cards	Criar	Permite criar novos cards no dashboard
dashboard.cards.update	Dashboard Cards	Editar	Permite editar cards existentes no dashboard
dashboard.cards.delete	Dashboard Cards	Excluir	Permite excluir cards no dashboard
hotspot.reports.read	Hotspot Relatórios	Visualizar/Pesquisar	Aceder à secção de relatórios e filtros
hotspot.reports.export	Hotspot Relatórios	Exportar	Exportar dados dos relatórios
campaigns.custom.create	Campanhas (Personalizadas)	Criar	\N
campaigns.custom.read	Campanhas (Personalizadas)	Ver	\N
campaigns.custom.update	Campanhas (Personalizadas)	Editar	\N
campaigns.custom.delete	Campanhas (Personalizadas)	Excluir	\N
campaigns.standard.read	Campanhas (Padrão)	Ver	\N
campaigns.standard.update	Campanhas (Padrão)	Editar	\N
campaigns.standard.delete	Campanhas (Padrão)	Excluir	\N
templates.custom.create	Templates (Personalizados)	Criar	\N
templates.custom.read	Templates (Personalizados)	Ver	\N
templates.custom.update	Templates (Personalizados)	Editar	\N
templates.custom.delete	Templates (Personalizados)	Excluir	\N
templates.standard.read	Templates (Padrão)	Ver	\N
templates.standard.update	Templates (Padrão)	Editar	\N
templates.standard.delete	Templates (Padrão)	Excluir	\N
banners.custom.create	Banners (Personalizados)	Criar	\N
banners.custom.read	Banners (Personalizados)	Ver	\N
banners.custom.update	Banners (Personalizados)	Editar	\N
banners.custom.delete	Banners (Personalizados)	Excluir	\N
banners.standard.read	Banners (Padrão)	Ver	\N
banners.standard.update	Banners (Padrão)	Editar	\N
banners.standard.delete	Banners (Padrão)	Excluir	\N
routers.cards.read	Roteadores Cards	Visualizar	Ver cards de estatísticas na página de roteadores
routers.group.create	Grupos de Roteadores	Criar/Adicionar	\N
routers.group.read	Grupos de Roteadores	Ver	\N
routers.group.update	Grupos de Roteadores	Editar	\N
routers.group.delete	Grupos de Roteadores	Excluir	\N
routers.individual.read	Roteadores Individuais	Ver	\N
routers.individual.update	Roteadores Individuais	Editar	\N
routers.individual.delete	Roteadores Individuais	Excluir	\N
routers.status.check	Roteadores Status	Verificar	Verificar status via ping
routers.discover.run	Roteadores Descoberta	Executar	Procurar novos roteadores
routers.discover.add	Roteadores Descoberta	Adicionar	Adicionar roteadores descobertos
users.admin.create	Utilizadores (Admin)	Criar	\N
users.admin.read.all	Utilizadores (Admin)	Ver (Todos Dados)	Ver todos os dados, incluindo sensíveis
users.admin.read.limited	Utilizadores (Admin)	Ver (Limitado)	Ver dados não sensíveis
users.admin.update.all	Utilizadores (Admin)	Editar (Todos Dados)	Editar todos os dados, incluindo sensíveis
users.admin.update.limited	Utilizadores (Admin)	Editar (Limitado)	Editar apenas role e status
users.admin.delete	Utilizadores (Admin)	Excluir	\N
users.admin.reset_password	Utilizadores (Admin)	Resetar Senha	\N
settings.profile.update_password	Configurações (Meu Perfil)	Alterar Senha	Alterar a própria senha
settings.general.read	Configurações (Geral)	Ver	\N
settings.general.write	Configurações (Geral)	Editar	\N
settings.hotspot.read	Configurações (Portal Hotspot)	Ver	\N
settings.hotspot.write	Configurações (Portal Hotspot)	Editar	\N
settings.permissions.read	Configurações (Permissões)	Ver	\N
settings.permissions.write	Configurações (Permissões)	Editar	\N
campaigns.read	Campanhas	Ler	Permite ler campanhas
banners.read	Banners	Ler	Permite ler banners
templates.read	Templates	Ler	Permite ler templates
dashboard.read	Dashboard	Ler	Permite ler dados do dashboard
hotspot.read	Hotspot	Ler	Permite pesquisar e ver dados do hotspot
users.read	Utilizadores	Ler	Permite listar utilizadores
users.create	Utilizadores	Criar	Permite criar utilizadores
users.update	Utilizadores	Atualizar	Permite atualizar utilizadores e resetar senha
users.delete	Utilizadores	Eliminar	Permite eliminar utilizadores
campaigns.create	Campanhas	Criar	Permite criar campanhas
campaigns.update	Campanhas	Atualizar	Permite atualizar campanhas
campaigns.delete	Campanhas	Eliminar	Permite eliminar campanhas
banners.create	Banners	Criar	Permite criar banners
banners.update	Banners	Atualizar	Permite atualizar banners
banners.delete	Banners	Eliminar	Permite eliminar banners
templates.create	Templates	Criar	Permite criar templates
templates.update	Templates	Atualizar	Permite atualizar templates
templates.delete	Templates	Eliminar	Permite eliminar templates
routers.read	Roteadores	Ler	Permite listar roteadores e grupos
routers.create	Roteadores	Criar	Permite adicionar roteadores e grupos
routers.update	Roteadores	Atualizar	Permite atualizar roteadores e grupos
routers.delete	Roteadores	Eliminar	Permite remover roteadores e grupos
settings.read	Configurações	Ler	Permite acessar a página de configurações
settings.general.update	Configurações	Atualizar Gerais	Permite atualizar configurações gerais
settings.hotspot.update	Configurações Hotspot	Atualizar	Permite atualizar configurações do hotspot
permissions.read	Permissões	Ler	Permite visualizar a matriz de permissões
permissions.update	Permissões	Atualizar	Permite editar a matriz de permissões
logs.read	Logs	Ler	Permite ler logs do sistema
lgpd.read	LGPD	Ler	Permite visualizar dados LGPD
lgpd.update	LGPD	Atualizar	Permite atualizar/atender solicitações LGPD
settings.appearance	Configurações	Alterar Aparência	Permite alterar a aparência do painel, como cores e fontes.
settings.modal_colors	Configurações	Alterar cores dos modais	Permite alterar as cores dos modais.
lgpd.delete	Gestão LGPD	Eliminar Utilizador	Permite eliminar permanentemente um utilizador do hotspot.
raffles.create	Sorteios	Criar	Permite criar novos sorteios
raffles.read	Sorteios	Ler	Permite visualizar os sorteios
raffles.update	Sorteios	Atualizar	Permite atualizar os sorteios
raffles.delete	Sorteios	Deletar	Permite deletar os sorteios
raffles.draw	Sorteios	Sortear	Permite realizar o sorteio
\.


--
-- Data for Name: radacct; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radacct (radacctid, acctsessionid, acctuniqueid, username, realm, nasipaddress, nasportid, nasporttype, acctstarttime, acctupdatetime, acctstoptime, acctinterval, acctsessiontime, acctauthentic, connectinfo_start, connectinfo_stop, acctinputoctets, acctoutputoctets, calledstationid, callingstationid, acctterminatecause, servicetype, framedprotocol, framedipaddress, framedipv6address, framedipv6prefix, framedinterfaceid, delegatedipv6prefix, class) FROM stdin;
2	80c00001	45389956117f061e92cd1dcef595f7ce	anapaulaborgessantos27@gmail.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-28 20:44:30-03	2025-09-28 20:50:38-03	2025-09-28 20:50:38-03	\N	367				1046186	31459177	MKT-001	32:84:AA:39:29:DD	Lost-Service			192.168.10.192	\N	\N	\N	\N	\N
1	80c00000	ec4057ee5594b11707fde2326c76e515	apolonio@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-28 19:21:22-03	2025-09-29 07:41:08-03	2025-09-29 07:41:08-03	\N	44386			\N	0	0	MKT-001	C6:5F:DF:84:7C:55	NAS-Reboot			192.168.10.196	\N	\N	\N	\N	\N
3	80d00000	3378fbbee2537c049486fc859b4916a9	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 07:48:15-03	2025-09-29 07:54:28-03	2025-09-29 07:54:28-03	\N	373				6653747	93025361	MKT-001	44:38:E8:4C:55:45	Lost-Service			192.168.10.190	\N	\N	\N	\N	\N
4	80d00002	f4dae4a2515bcdb9d6ade7ea54fbcbb9	bruno.silva@rotatransportes.com.br	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 07:51:16-03	2025-09-29 07:54:47-03	2025-09-29 07:54:47-03	\N	212				4647493	23253367	MKT-001	64:32:A8:7A:2A:79	Lost-Service			192.168.10.189	\N	\N	\N	\N	\N
5	80d00003	5608cb9aeae39781723b00f52c8c5d2c	rafael.gomes@grupobrasileiro.com.br	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 08:37:17-03	2025-09-29 09:16:32-03	2025-09-29 09:16:32-03	\N	2355				4354172	30106720	MKT-001	F6:9C:18:E9:B6:5A	Lost-Service			192.168.10.188	\N	\N	\N	\N	\N
7	80d00004	7aaf0ffe5c62e293ab4abd981227b0bb	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 09:19:45-03	2025-09-29 09:23:01-03	2025-09-29 09:23:01-03	\N	196			\N	0	0	MKT-000001	44:38:E8:4C:55:45	Lost-Carrier			192.168.10.190	\N	\N	\N	\N	\N
8	80d00005	972d32cef4b58362919c31cedb8c09c8	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 09:23:31-03	2025-09-29 09:24:05-03	2025-09-29 09:24:05-03	\N	35				470	208	MKT-000001	44:38:E8:4C:55:45	Lost-Carrier			192.168.10.190	\N	\N	\N	\N	\N
9	80d00006	210c35a19ec65def1054187a1caf8147	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 09:24:31-03	2025-09-29 09:25:25-03	2025-09-29 09:25:25-03	\N	54				1827001	8098629	MKT-000001	44:38:E8:4C:55:45	Lost-Service			192.168.10.190	\N	\N	\N	\N	\N
6	80d00004	f33af9a361156e03b34b26065805ddb9	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 09:19:45-03	2025-09-29 09:31:26-03	2025-09-29 09:31:26-03	\N	701			\N	0	0	MKT-001	44:38:E8:4C:55:45	NAS-Reboot			192.168.10.190	\N	\N	\N	\N	\N
12	80e00008	dd83c96fbd9cac259bfb075a21cbe6a0	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 09:57:50-03	2025-09-29 11:04:55-03	2025-09-29 11:04:55-03	\N	4026				47271591	1178247235	MKT-000001	44:38:E8:4C:55:45	Lost-Service			192.168.10.185	\N	\N	\N	\N	\N
14	80e0000c	a4be3258718cdfa96badb60e76a5119f	Samsunga02@gmail.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 10:58:54-03	2025-09-29 11:59:03-03	2025-09-29 11:59:03-03	\N	3609				989859	8048236	MKT-000001	0A:14:5B:7D:26:6B	Lost-Service			192.168.10.179	\N	\N	\N	\N	\N
13	80e0000b	73e9ff6d3b8ef63162313e8c99449195	seuemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 10:49:16-03	2025-09-29 11:59:11-03	2025-09-29 11:59:11-03	\N	4195				1924462	29131763	MKT-000001	C2:F3:E4:76:A8:76	Lost-Service			192.168.10.182	\N	\N	\N	\N	\N
15	80e0000d	dc847db94c164c969f7cec73d570d228	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-30 07:28:41-03	2025-09-30 08:35:02-03	2025-09-30 08:35:02-03	\N	3981				18815367	504622729	MKT-000001	44:38:E8:4C:55:45	Lost-Carrier			192.168.10.185	\N	\N	\N	\N	\N
16	80e0000e	05afd974180c9cac3cead073bf4ab41e	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-30 08:38:41-03	2025-09-30 08:42:03-03	2025-09-30 08:42:03-03	\N	202				926176	11192660	MKT-000001	44:38:E8:4C:55:45	Lost-Service			192.168.10.173	\N	\N	\N	\N	\N
17	80e0000f	1573cdfce7022a39c7d90a4644eab848	meunome@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 07:34:34-03	2025-10-01 07:35:41-03	2025-10-01 07:35:41-03	\N	67				638566	5482351	MKT-000001	44:38:E8:4C:55:45	Lost-Carrier			192.168.10.173	\N	\N	\N	\N	\N
18	80e00010	cec9194163c1462ad31d4bc1ed57f614	meunome@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 07:36:26-03	2025-10-01 07:44:18-03	2025-10-01 07:44:18-03	\N	472				2469175	19666686	MKT-000001	44:38:E8:4C:55:45	Lost-Service			192.168.10.173	\N	\N	\N	\N	\N
10	80e00000	dbd223ed8f30cfe05cc4d2eadbd7c806	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 09:30:53-03	2025-10-01 10:27:21-03	2025-10-01 10:27:21-03	\N	176188			\N	0	0	MKT-000001	44:38:E8:4C:55:45	NAS-Reboot			192.168.10.190	\N	\N	\N	\N	\N
11	80e00006	4cf837b8297f129010676ade936f31b3	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-09-29 09:46:13-03	2025-10-01 10:27:21-03	2025-10-01 10:27:21-03	\N	175268			\N	0	0	MKT-000001	44:38:E8:4C:55:45	NAS-Reboot			192.168.10.190	\N	\N	\N	\N	\N
19	80f00000	062b9f1996dbe4209f7ab37665f565f1	seuemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 10:31:47-03	2025-10-01 10:55:22-03	2025-10-01 10:55:22-03	\N	1379				872866	4708688	MKT-000001	BE:51:2B:74:DE:AA	Lost-Service			192.168.10.169	\N	\N	\N	\N	\N
20	8000000a	253ebbe0bf7ea9c471a5a51afe388c95	seuemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 14:21:57-03	2025-10-01 14:41:38-03	2025-10-01 14:41:38-03	\N	1181				1011181	2816859	MKT-000001	42:46:EB:1F:85:0E	Lost-Service			192.168.10.168	\N	\N	\N	\N	\N
21	8000000e	1a4a0f270820341e4533da903ca9f89d	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 14:27:17-03	2025-10-01 14:42:11-03	2025-10-01 14:42:11-03	\N	894				6313561	37503734	MKT-000001	44:38:E8:4C:55:45	Lost-Service			192.168.10.167	\N	\N	\N	\N	\N
22	80000011	5f9c112b6b9ac039f5591b97163de9d6	purpurina@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 16:42:35-03	2025-10-01 17:42:22-03	2025-10-01 17:42:22-03	\N	3587				8510675	275179626	MKT-000001	44:38:E8:4C:55:45	Lost-Service			192.168.10.167	\N	\N	\N	\N	\N
23	80100000	20ed8b86c728e718b85cffc0615e8f77	meupcdesktop@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 20:34:30-03	2025-10-01 20:47:34-03	2025-10-01 20:47:34-03	\N	784				1303733	5933600	MKT-000001	74:D4:35:92:77:F6	Lost-Service			192.168.10.166	\N	\N	\N	\N	\N
24	80100001	77ef7f82e4e95ca331644b4fffcf5ffa	meudesktopwifi@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 20:47:28-03	2025-10-01 21:12:24-03	2025-10-01 21:12:24-03	\N	1496				9414056	23717102	MKT-000001	00:E0:4D:1C:01:51	Lost-Carrier			192.168.10.158	\N	\N	\N	\N	\N
25	80100002	de6e7b2964fc9ea467c6c149ecfb3880	fulano@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 21:12:54-03	2025-10-01 21:16:14-03	2025-10-01 21:16:14-03	\N	200				1141647	5735470	MKT-000001	00:E0:4D:1C:01:51	Lost-Service			192.168.10.157	\N	\N	\N	\N	\N
26	80100004	ad3a9710c4195af252dbaaa8adca1460	meudesktopwifi@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 21:15:22-03	2025-10-01 21:31:47-03	2025-10-01 21:31:47-03	\N	985				131098166	135696915	MKT-000001	74:D4:35:92:77:F6	Lost-Service			192.168.10.166	\N	\N	\N	\N	\N
27	80100007	9f0d662e87e896af9687e5e1760e713c	seuemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 21:31:32-03	2025-10-01 22:33:29-03	2025-10-01 22:33:29-03	\N	3717				575651	5568867	MKT-000001	A6:E1:31:34:15:92	Lost-Service			192.168.10.159	\N	\N	\N	\N	\N
28	80100008	050fa3bf262e2b3fac6eabde92f609a7	meudesktopwifi@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-01 21:32:38-03	2025-10-01 22:43:39-03	2025-10-01 22:43:39-03	\N	4261				15627528	499623704	MKT-000001	74:D4:35:92:77:F6	Lost-Service			192.168.10.166	\N	\N	\N	\N	\N
29	80200000	9cc071ec5fa40ee05a9fb4f7d9ffcbc5	seuemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-02 20:25:59-03	2025-10-02 22:29:25-03	2025-10-02 22:29:25-03	\N	7406			\N	0	0	MKT-000001	A6:E1:31:34:15:92	NAS-Reboot			192.168.10.252	\N	\N	\N	\N	\N
30	80500000	748c9bf08002791da79ff660fe4d8021	fulano@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-02 22:57:14-03	2025-10-02 23:13:27-03	2025-10-02 23:13:27-03	\N	972				22499814	15157887	MKT-000001	00:E0:4D:1C:01:51	Admin-Reset			192.0.3.252	\N	\N	\N	\N	\N
31	80500001	a549af29cc832ff59691cdc8eeb2079b	seuemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-02 23:14:05-03	2025-10-02 23:21:31-03	2025-10-02 23:21:31-03	\N	446				2108099	9296704	MKT-000001	00:E0:4D:1C:01:51	Lost-Service			192.0.3.252	\N	\N	\N	\N	\N
32	80600001	7d2f6733f794431f087dfe845fecacc2	Corporativo@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-02 23:30:35-03	2025-10-03 00:35:13-03	2025-10-03 00:35:13-03	\N	3878				1805570	48794022	MKT-000001	A6:E1:31:34:15:92	Lost-Service			192.0.3.253	\N	\N	\N	\N	\N
33	80600002	e0f0f22072515f8af09e213e3a37657d	lorena_leite@yahoo.com.br	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-06 08:50:26-03	2025-10-06 08:57:19-03	2025-10-06 08:57:19-03	\N	414				503370	3720851	MKT-000001	4A:16:F0:02:42:8D	Lost-Service			192.0.3.247	\N	\N	\N	\N	\N
34	80600003	6fa85c766b9daa51251afb8383385bdf	ithalovk@gmail.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-11 20:38:01-03	2025-10-11 21:34:01-03	2025-10-11 21:34:01-03	\N	3360				6395342	122372445	MKT-000001	EE:A3:77:45:C7:AB	Lost-Service			192.0.3.245	\N	\N	\N	\N	\N
35	80900000	e29911a0db1dfcaf5932161aa78dcc8b	eunapolis@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-14 22:06:06-03	2025-10-14 23:09:58-03	2025-10-14 23:09:58-03	\N	3832			\N	0	0	RT-000001	C6:5F:DF:84:7C:55	NAS-Reboot			192.0.3.250	\N	\N	\N	\N	\N
36	80900001	0a5f956df696c906231d9f10062583f6	usuario3@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-14 23:08:03-03	2025-10-14 23:09:58-03	2025-10-14 23:09:58-03	\N	115			\N	0	0	RT-000001	44:38:E8:4C:55:45	NAS-Reboot			192.0.3.202	\N	\N	\N	\N	\N
37	80300000	c4c9b974eeb826e7fa7cb23206b1706c	segundoemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-17 19:28:21-03	2025-10-18 12:50:57-03	2025-10-18 12:50:57-03	\N	62556				99733439	482796059	CS-0008085	C6:5F:DF:84:7C:55	Lost-Service			192.168.10.253	\N	\N	\N	\N	\N
38	80300001	d3b9c9ba49f2d8c0c24e96eea3aa0932	terceiroemail@email.com	\N	172.16.12.238	bridge1	Wireless-802.11	2025-10-17 21:37:16-03	2025-10-20 08:57:22-03	2025-10-20 08:57:22-03	\N	213606			\N	0	0	CS-008085	A6:E1:31:34:15:92	NAS-Reboot			192.168.10.251	\N	\N	\N	\N	\N
\.


--
-- Data for Name: radcheck; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radcheck (id, username, attribute, op, value) FROM stdin;
4	fulano@email.com	Crypt-Password	:=	$2b$10$YELouy8DnDzUKgkFon3PE.NmdmzolLvy/pHJwAt1xHGtENaMxk0w6
5	apolonio@email.com	Crypt-Password	:=	$2b$10$vjrOMbUcMUa4nNSOldn06ef5IvkoF19AwsHp9C4EvfpK2veQweTSK
6	anapaulaborgessantos27@gmail.com	Crypt-Password	:=	$2b$10$6K75tHOzDu.ZBzv7cgP7KOrOp/msCUCknyBn1SF0YxR.KPiPgat6u
7	purpurina@email.com	Crypt-Password	:=	$2b$10$vb7iMV/0cq4erYM0rQgSxeVuOhjQcdxH7kah4vJJ7Xli9d/wc5cHi
8	bruno.silva@rotatransportes.com.br	Crypt-Password	:=	$2b$10$niZbykuSfx.61w3Rtmwp.usFawjWunD1q9N9twXuKVzvfG0984X/W
9	rafael.gomes@grupobrasileiro.com.br	Crypt-Password	:=	$2b$10$RlEPurH5S10OyAGQz2kRNuijROac3PmBkzkQVRLu1HxRJkxJ5nZxy
10	seuemail@email.com	Crypt-Password	:=	$2b$10$gbIcWppfsgcOfVf9G7sHI.AX1tjYr9t1hUGYGTLXOxa236ljXeYAG
11	Samsunga02@gmail.com	Crypt-Password	:=	$2b$10$XMT7ruQ3gLPB50cNcMxL3uPkoDB49vPq5i0boa9wrUF0/syQ3S0r2
12	cabelo@email.com	Crypt-Password	:=	$2b$10$l468MWCk/ZuV59DjjeTbMOX9JSMGUFJadyO7mVcRyFD9uTtllnlGi
13	usuario39@email.com	Crypt-Password	:=	$2b$10$tM2Faxc0O/spRlUThFu4j.dgJTX1Jok7jMiosStTtvt/buK2xk5.2
14	meunome@email.com	Crypt-Password	:=	$2b$10$FJ8mVpLlsaPY6QgTb4gUSe94.lSVXov9gIGczG3o59yahQHss/Uzq
15	Fredsonpereiradeoliveirasantos@gmail.com	Crypt-Password	:=	$2b$10$JDNKVMkYsfUyjvzl7eKT/.Oz1d7IQWOprAuqDgeYaBWbdKM93MwBq
16	meupcdesktop@email.com	Crypt-Password	:=	$2b$10$4OcTF8fU8qFNK/NmvWO0zOHmOVdErtzIUXDuCcANkDQEeICqTUkJK
17	meudesktopwifi@email.com	Crypt-Password	:=	$2b$10$6rUCXhVHp5h82/WGTG/.seonf2HT7DO/qi6QPMuEXOx7dP4Dhs8uu
18	Corporativo@email.com	Crypt-Password	:=	$2b$10$GOqNcT0pw/6k3MTM0cD6NuGxgebEB7Ycv84hRzsaaOggXGyD5Y9GO
19	lorena_leite@yahoo.com.br	Crypt-Password	:=	$2b$10$wHRjoVAWZ7kgr/9v8wlSD.Hstz6aUFT1kQXlNv2pyYbR6vSgZ7r.O
20	ithalovk@gmail.com	Crypt-Password	:=	$2b$10$mOQh9Yw./hgks10g83yE6.iRe7iLW1srWVm5lr72RSBerr.UtlbEm
21	email1@email.com	Crypt-Password	:=	$2b$10$J0PUFl1QZmG2Tfq29tCoSu7r8DGx27M03whdGDxVyE9mXn1k/IjVG
22	augustu@email.com	Crypt-Password	:=	$2b$10$GvDPti39f87UkLTShih6wexEoWzvuWdziPVvB9c9Ix5Q2Ay93yRRa
23	eunapolis@email.com	Crypt-Password	:=	$2b$10$MMLIZe.v6.fsr0iu6E2RYuFgghNjnzomEJy5kGw8kSBS4k.KS6a6m
24	usuario3@email.com	Crypt-Password	:=	$2b$10$AL2U7Ku6d73Jzcq2qYnFwuLAKUYmb2s8FU.ltbNkpyCP79k2Y.M4S
25	usuario5@email.com	Crypt-Password	:=	$2b$10$K8oGHbSDwDuRGMlIDaZ9Q.47/TddAcAde5J7k1fOYL2Ro4hSb/BoW
26	fredson@email.com	Crypt-Password	:=	$2b$10$EabcoZAFwAHZQSXj3v.c3uab90cXVlfKDSrClBjQLaBAtoYUt/ahW
27	segundoemail@email.com	Crypt-Password	:=	$2b$10$l1UgenjhcLB8RPcuqFlQSuBywuo4TP8Ig23cA.g3k1ERPoYd6l3C6
28	terceiroemail@email.com	Crypt-Password	:=	$2b$10$/GOAdLg6vzZPunzYjBC.eOMruED7Ye8V6hDCvRt/JhRmp6bJHim1S
\.


--
-- Data for Name: radgroupcheck; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radgroupcheck (id, groupname, attribute, op, value) FROM stdin;
\.


--
-- Data for Name: radgroupreply; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radgroupreply (id, groupname, attribute, op, value) FROM stdin;
\.


--
-- Data for Name: radpostauth; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radpostauth (id, username, pass, reply, calledstationid, callingstationid, authdate, class) FROM stdin;
1	apolonio@email.com	12345678	Access-Accept	\N	\N	2025-09-28 19:21:22.378504-03	\N
2	anapaulaborgessantos27@gmail.com	140899	Access-Accept	\N	\N	2025-09-28 20:44:30.930362-03	\N
3	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 07:48:15.612783-03	\N
4	bruno.silva@rotatransportes.com.br	123459	Access-Reject	\N	\N	2025-09-29 07:50:35.482857-03	\N
5	bruno.silva@rotatransportes.com.br	123459	Access-Accept	\N	\N	2025-09-29 07:51:16.004234-03	\N
6	rafael.gomes@grupobrasileiro.com.br	rota1010	Access-Accept	\N	\N	2025-09-29 08:37:17.905756-03	\N
7	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 09:19:45.453884-03	\N
8	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 09:23:30.963062-03	\N
9	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 09:24:31.298197-03	\N
10	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 09:31:26.739287-03	\N
11	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 09:35:01.619494-03	\N
12	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 09:46:13.875477-03	\N
13	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 09:57:49.920021-03	\N
14	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 10:29:17.296032-03	\N
15	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-29 10:29:38.697401-03	\N
16	seuemail@email.com	12345678	Access-Accept	\N	\N	2025-09-29 10:49:16.631804-03	\N
17	Samsunga02@gmail.com	12345678	Access-Accept	\N	\N	2025-09-29 10:58:54.891902-03	\N
18	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-30 07:28:42.328683-03	\N
19	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-09-30 08:38:42.084904-03	\N
20	meunome@email.com	12345678	Access-Accept	\N	\N	2025-10-01 07:34:35.983099-03	\N
21	meunome@email.com	12345678	Access-Accept	\N	\N	2025-10-01 07:36:28.141291-03	\N
22	seuemail@email.com	12345678	Access-Accept	\N	\N	2025-10-01 10:32:23.124987-03	\N
23	ciclano@email.com	12345678	Access-Reject	\N	\N	2025-10-01 14:08:39.085295-03	\N
24	ciclano@email.com	12345678	Access-Reject	\N	\N	2025-10-01 14:08:59.55268-03	\N
25	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:10:22.081557-03	\N
26	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:11:02.557538-03	\N
27	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:11:54.961134-03	\N
28	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:13:23.727772-03	\N
29	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:14:38.81498-03	\N
30	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:17:54.701782-03	\N
31	ciclano@email.com	12345678	Access-Reject	\N	\N	2025-10-01 14:18:04.683111-03	\N
32	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:20:58.960169-03	\N
33	seuemail@email.com	12345678	Access-Accept	\N	\N	2025-10-01 14:21:57.473503-03	\N
34	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 14:22:42.11104-03	\N
35	fredson.santos@rotatransportes.com.br	12345678	Access-Reject	\N	\N	2025-10-01 14:25:45.630557-03	\N
36	seuemail@emai.com	12345678	Access-Reject	\N	\N	2025-10-01 14:26:43.788251-03	\N
37	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-10-01 14:27:17.363-03	\N
38	fredson.santos@rotatransportes.com.br	12345678	Access-Reject	\N	\N	2025-10-01 16:42:06.597704-03	\N
39	seuemail@emai.com	12345678	Access-Reject	\N	\N	2025-10-01 16:42:17.860117-03	\N
40	purpurina@email.com	12345678	Access-Accept	\N	\N	2025-10-01 16:42:35.219731-03	\N
41	meupcdesktop@email.com	12345678	Access-Accept	\N	\N	2025-10-01 20:34:30.727674-03	\N
42	meudesktopwifi@email.com	12345678	Access-Accept	\N	\N	2025-10-01 20:47:28.253028-03	\N
43	fulano@email.com	12345678	Access-Accept	\N	\N	2025-10-01 21:12:54.724448-03	\N
44	fulano@email.com	12345678	Access-Accept	\N	\N	2025-10-01 21:15:04.608617-03	\N
45	meudesktopwifi@email.com	12345678	Access-Accept	\N	\N	2025-10-01 21:15:22.112218-03	\N
46	fredsonpereiradeoliveirasantos@gmail.com	12345678	Access-Reject	\N	\N	2025-10-01 21:30:48.799525-03	\N
47	ciclano@email.com	12345678	Access-Reject	\N	\N	2025-10-01 21:31:10.171642-03	\N
48	seuemail@email.com	12345678	Access-Accept	\N	\N	2025-10-01 21:31:32.692409-03	\N
49	meudesktopwifi@email.com	12345678	Access-Accept	\N	\N	2025-10-01 21:32:38.621579-03	\N
50	seuemail@email.com	12345678	Access-Accept	\N	\N	2025-10-02 20:25:59.388991-03	\N
51	fulano@email.com	12345678	Access-Accept	\N	\N	2025-10-02 22:57:14.723381-03	\N
52	seuemail@email.com	12345678	Access-Accept	\N	\N	2025-10-02 23:14:05.261941-03	\N
53	beltrano@email.com	12345678	Access-Reject	\N	\N	2025-10-02 23:29:16.307702-03	\N
54	Corporativo@email.com	12345678	Access-Accept	\N	\N	2025-10-02 23:30:35.366543-03	\N
55	lorena_leite@yahoo.com.br	Lorenaleite22	Access-Accept	\N	\N	2025-10-06 08:50:28.493656-03	\N
56	ithalovk@gmail.com	Ithalo27.	Access-Accept	\N	\N	2025-10-11 20:38:07.478382-03	\N
57	eunapolis@email.com	12345678	Access-Accept	\N	\N	2025-10-14 22:06:06.04823-03	\N
58	usuario3@email.com	12345678	Access-Accept	\N	\N	2025-10-14 23:08:03.605375-03	\N
59	segundoemail@email.com	12345678	Access-Accept	\N	\N	2025-10-17 19:28:22.743009-03	\N
60	terceiroemail@email.com	12345678	Access-Accept	\N	\N	2025-10-17 21:37:17.69757-03	\N
\.


--
-- Data for Name: radreply; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radreply (id, username, attribute, op, value) FROM stdin;
\.


--
-- Data for Name: radusergroup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.radusergroup (id, username, groupname, priority) FROM stdin;
\.


--
-- Data for Name: raffle_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.raffle_participants (id, raffle_id, user_id) FROM stdin;
6	9	2
7	9	3
8	9	4
9	9	5
10	9	6
11	9	7
12	9	8
13	9	9
14	9	10
15	9	12
16	9	13
17	9	14
18	9	15
19	9	16
20	9	17
21	9	18
22	9	19
23	9	20
24	9	21
25	9	22
26	9	23
27	9	24
28	9	25
29	9	26
30	9	27
31	9	28
32	9	30
33	9	32
34	9	33
35	8	2
36	8	3
37	8	4
38	8	5
39	8	6
40	8	7
41	8	8
42	8	9
43	8	10
44	8	12
45	8	13
46	8	14
47	8	15
48	8	16
49	8	17
50	8	18
51	8	19
52	8	20
53	8	21
54	8	22
55	8	23
56	8	24
57	8	25
58	8	26
59	8	27
60	8	28
61	8	30
62	8	32
63	8	33
64	7	2
65	7	3
66	7	4
67	7	5
68	7	6
69	7	7
70	7	8
71	7	9
72	7	10
73	7	12
74	7	13
75	7	14
76	7	15
77	7	16
78	7	17
79	7	18
80	7	19
81	7	20
82	7	21
83	7	22
84	7	23
85	7	24
86	7	25
87	7	26
88	7	27
89	7	28
90	7	30
91	7	32
92	7	33
93	10	2
94	10	3
95	10	4
96	10	5
97	10	6
98	10	7
99	10	8
100	10	9
101	10	10
102	10	12
103	10	13
104	10	14
105	10	15
106	10	16
107	10	17
108	10	18
109	10	19
110	10	20
111	10	21
112	10	22
113	10	23
114	10	24
115	10	25
116	10	26
117	10	27
118	10	28
119	10	30
120	10	32
121	10	33
122	6	2
123	6	3
124	11	2
125	11	3
126	11	4
127	11	5
128	11	6
129	11	7
130	11	8
131	11	9
132	11	10
133	11	12
134	11	13
135	11	14
136	11	15
137	11	16
138	11	17
139	11	18
140	11	19
141	11	20
142	11	21
143	11	22
144	11	23
145	11	24
146	11	25
147	11	26
148	11	27
149	11	28
150	11	30
151	11	32
152	11	33
153	12	2
154	12	3
155	12	4
156	12	5
157	12	6
158	12	7
159	12	8
160	12	9
161	12	10
162	12	12
163	12	13
164	12	14
165	12	15
166	12	16
167	12	17
168	12	18
169	12	19
170	12	20
171	12	21
172	12	22
173	12	23
174	12	24
175	12	25
176	12	26
177	12	27
178	12	28
179	12	30
180	12	32
181	12	33
182	13	2
183	13	3
184	13	4
185	13	5
186	13	6
187	13	7
188	13	8
189	13	9
190	13	10
191	13	12
192	13	13
193	13	14
194	13	15
195	13	16
196	13	17
197	13	18
198	13	19
199	13	20
200	13	21
201	13	22
202	13	23
203	13	24
204	13	25
205	13	26
206	13	27
207	13	28
208	13	30
209	13	32
210	13	33
211	14	2
212	14	3
213	14	4
214	14	5
215	14	6
216	14	7
217	14	8
218	14	9
219	14	10
220	14	12
221	14	13
222	14	14
223	14	15
224	14	16
225	14	17
226	14	18
227	14	19
228	14	20
229	14	21
230	14	22
231	14	23
232	14	24
233	14	25
234	14	26
235	14	27
236	14	28
237	14	30
238	14	32
239	14	33
240	15	2
241	15	3
242	15	4
243	15	5
244	15	6
245	15	7
246	15	8
247	15	9
248	15	10
249	15	12
250	15	13
251	15	14
252	15	15
253	15	16
254	15	17
255	15	18
256	15	19
257	15	20
258	15	21
259	15	22
260	15	23
261	15	24
262	15	25
263	15	26
264	15	27
265	15	28
266	15	30
267	15	32
268	15	33
269	16	2
270	16	3
271	16	4
272	16	5
273	16	6
274	16	7
275	16	8
276	16	9
277	16	10
278	16	12
279	16	13
280	16	14
281	16	15
282	16	16
283	16	17
284	16	18
285	16	19
286	16	20
287	16	21
288	16	22
289	16	23
290	16	24
291	16	25
292	16	26
293	16	27
294	16	28
295	16	30
296	16	32
297	16	33
\.


--
-- Data for Name: raffles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.raffles (id, raffle_number, title, observation, created_at, created_by_user_id, winner_id, filters) FROM stdin;
1	051125-2131.1	sorteio teste		2025-11-05 21:31:33.094449-03	1	\N	{"router": "", "consent": true, "endDate": "", "campaign": "", "startDate": "2025-10-01"}
2	051125-2132.2	sorteio teste		2025-11-05 21:32:00.511418-03	1	\N	{"router": "", "consent": true, "endDate": "2025-11-05", "campaign": "", "startDate": "2025-10-01"}
3	051125-2133.3	sorteio teste		2025-11-05 21:32:33.181089-03	1	\N	{"router": "", "consent": true, "endDate": "2025-11-05", "campaign": "8", "startDate": "2025-10-01"}
4	051125-2133.4	sorteio teste		2025-11-05 21:33:19.167849-03	1	\N	{"router": "", "consent": false, "endDate": "", "campaign": "", "startDate": "2025-10-01"}
5	051125-2134.5	sorteio teste		2025-11-05 21:33:24.79174-03	1	\N	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": ""}
9	051125-2224.9	sorteio teste		2025-11-05 22:22:55.560515-03	20	14	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2024-12-05"}
8	051125-2214.8	sorteio teste	sem accept	2025-11-05 22:13:28.661282-03	20	4	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2024-12-31"}
7	051125-2150.7	sorteio teste		2025-11-05 21:50:35.280004-03	1	24	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2025-01-01"}
10	051125-2304.10	sorteio teste		2025-11-05 23:04:04.908649-03	20	33	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2024-12-05"}
6	051125-2135.6	sorteio teste		2025-11-05 21:34:49.049955-03	1	2	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2025-10-01"}
11	051125-2330.11	sorteio teste		2025-11-05 23:29:40.511529-03	20	15	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2024-12-01"}
12	051125-2330.12	sorteio teste		2025-11-05 23:30:23.849276-03	20	26	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2024-12-01"}
13	051125-2332.13	sorteio teste	teste	2025-11-05 23:32:07.693161-03	20	24	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2024-10-05"}
14	051125-2336.14	sorteio teste	efera	2025-11-05 23:36:19.318468-03	20	33	{"router": "", "consent": false, "endDate": "2025-11-05", "campaign": "", "startDate": "2024-11-05"}
15	061125-1628.15	sorteio teste		2025-11-06 16:28:32.462125-03	1	18	{"router": "", "consent": false, "endDate": "2025-11-06", "campaign": "", "startDate": "2024-09-06"}
16	091125-2330.16	sorteio teste 2		2025-11-09 23:30:27.974495-03	20	23	{"router": "", "consent": false, "endDate": "2025-11-08", "campaign": "", "startDate": "2024-11-09"}
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_name, permission_key) FROM stdin;
master	dashboard.cards.read
master	dashboard.cards.create
master	dashboard.cards.update
master	dashboard.cards.delete
master	hotspot.reports.read
master	hotspot.reports.export
master	campaigns.custom.create
master	campaigns.custom.read
master	campaigns.custom.update
master	campaigns.custom.delete
master	campaigns.standard.read
master	campaigns.standard.update
master	campaigns.standard.delete
master	templates.custom.create
master	templates.custom.read
master	templates.custom.update
master	templates.custom.delete
master	templates.standard.read
master	templates.standard.update
master	templates.standard.delete
master	banners.custom.create
master	banners.custom.read
master	banners.custom.update
master	banners.custom.delete
master	banners.standard.read
master	banners.standard.update
master	banners.standard.delete
master	routers.cards.read
master	routers.group.create
master	routers.group.read
master	routers.group.update
master	routers.group.delete
master	routers.individual.read
master	routers.individual.update
master	routers.individual.delete
master	routers.status.check
master	routers.discover.run
master	routers.discover.add
master	users.admin.create
master	users.admin.read.all
master	users.admin.update.all
master	users.admin.delete
master	users.admin.reset_password
master	settings.profile.update_password
master	settings.general.read
master	settings.general.write
master	settings.hotspot.read
master	settings.hotspot.write
master	settings.permissions.read
master	settings.permissions.write
gestao	dashboard.cards.read
gestao	hotspot.reports.read
gestao	hotspot.reports.export
gestao	campaigns.custom.create
gestao	campaigns.custom.read
gestao	campaigns.custom.update
gestao	campaigns.custom.delete
gestao	campaigns.standard.read
gestao	templates.custom.create
gestao	templates.custom.read
gestao	templates.custom.update
gestao	templates.custom.delete
gestao	templates.standard.read
gestao	banners.custom.create
gestao	banners.custom.read
gestao	banners.custom.update
gestao	banners.custom.delete
gestao	banners.standard.read
gestao	routers.group.create
gestao	routers.group.read
gestao	routers.group.update
gestao	routers.individual.read
gestao	routers.individual.update
gestao	routers.status.check
gestao	routers.discover.run
gestao	routers.discover.add
gestao	users.admin.read.limited
gestao	users.admin.update.limited
gestao	users.admin.reset_password
gestao	settings.profile.update_password
estetica	dashboard.cards.read
estetica	hotspot.reports.read
estetica	hotspot.reports.export
estetica	campaigns.custom.create
estetica	campaigns.custom.read
estetica	campaigns.custom.update
estetica	campaigns.standard.read
estetica	templates.custom.create
estetica	templates.custom.read
estetica	templates.custom.update
estetica	templates.standard.read
estetica	banners.standard.read
estetica	settings.profile.update_password
DPO	dashboard.cards.read
DPO	users.admin.read.all
DPO	settings.profile.update_password
DPO	settings.general.read
DPO	settings.permissions.read
estetica	banners.custom.create
estetica	banners.custom.update
estetica	banners.custom.delete
estetica	banners.custom.read
gestao	settings.permissions.read
gestao	settings.hotspot.write
gestao	settings.hotspot.read
DPO	dashboard.read
DPO	hotspot.read
DPO	users.read
DPO	permissions.read
estetica	dashboard.read
estetica	hotspot.read
gestao	dashboard.read
gestao	hotspot.read
gestao	users.read
gestao	users.update
gestao	campaigns.read
gestao	campaigns.create
gestao	campaigns.update
gestao	banners.read
gestao	banners.create
gestao	banners.update
gestao	templates.read
gestao	templates.create
gestao	templates.update
gestao	routers.read
gestao	routers.create
gestao	routers.update
gestao	settings.read
gestao	settings.hotspot.update
estetica	settings.general.read
gestao	settings.general.read
DPO	banners.standard.read
DPO	banners.custom.read
DPO	campaigns.read
DPO	campaigns.standard.read
DPO	campaigns.custom.read
DPO	settings.read
DPO	hotspot.reports.read
DPO	lgpd.update
DPO	lgpd.read
DPO	logs.read
DPO	routers.cards.read
DPO	templates.read
DPO	templates.standard.read
DPO	templates.custom.read
DPO	users.admin.read.limited
DPO	settings.hotspot.read
DPO	routers.read
DPO	routers.individual.read
DPO	routers.status.check
estetica	campaigns.update
estetica	campaigns.create
estetica	campaigns.read
estetica	campaigns.custom.delete
estetica	routers.group.read
estetica	routers.status.check
estetica	templates.update
estetica	templates.create
estetica	templates.delete
estetica	templates.read
estetica	templates.custom.delete
DPO	routers.group.read
estetica	campaigns.delete
estetica	routers.read
estetica	routers.individual.read
DPO	lgpd.delete
estetica	raffles.update
estetica	raffles.create
estetica	raffles.read
estetica	raffles.draw
gestao	raffles.read
DPO	banners.read
estetica	banners.update
estetica	banners.create
estetica	banners.delete
estetica	banners.read
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (role_name, description) FROM stdin;
master	Super Administrador com acesso total.
gestao	Gestor operacional com acesso ampliado.
estetica	Responsável pelo marketing e personalização do portal.
DPO	Data Protection Officer (auditoria e LGPD).
\.


--
-- Data for Name: rotahotspot_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rotahotspot_details (id, username, nome_completo, telefone, mac_address, router_name, data_cadastro, ultimo_login) FROM stdin;
\.


--
-- Data for Name: router_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.router_groups (id, name, observacao) FROM stdin;
17	Grupo Cidade Sol	Grupo de roteadores da Cidade Sol
\.


--
-- Data for Name: routers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.routers (id, name, status, last_seen, group_id, observacao, ip_address) FROM stdin;
2	RT-000002	online	2025-11-06 21:31:38.518626-03	\N	Agência central de Ilhéus.	172.16.12.243
12	VIP-000002	online	2025-11-06 21:31:39.029909-03	\N	Veículo executivo 1.	172.16.12.11
5	VM-000001	offline	\N	\N	Guichê em Vitória da Conquista.	\N
6	VM-000002	offline	\N	\N	Ponto de parada em Jequié.	\N
11	VIP-000001	offline	\N	\N	Sala da diretoria.	\N
10	MKT-000002	offline	\N	\N	Instalado na sala de reuniões da garagem.	\N
3	CS-000001	online	2025-11-06 21:31:31.272859-03	17	Ponto de apoio em Salvador.	172.16.12.9
15	CS-0008085	online	2025-11-06 21:31:31.677024-03	17	Roteador teste	172.16.12.31
14	CS-008085	online	2025-11-06 21:31:31.993692-03	17	Teste de adição de roteadores	172.16.12.3
7	GB-000001	offline	2025-11-06 21:31:32.29251-03	\N	Hub principal em São Paulo.	172.16.12.241
8	GB-000002	offline	2025-11-06 21:31:37.323477-03	\N	Escritório no Rio de Janeiro.	172.16.12.240
9	MKT-000001	online	2025-11-06 21:31:37.684137-03	\N	Roteador do departamento de Marketing na Sede.	172.16.12.30
1	RT-000001	online	2025-11-06 21:31:38.224657-03	\N	Localizado no terminal rodoviário de Itabuna.	172.16.12.22
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.system_settings (id, company_name, logo_url, primary_color, session_timeout_minutes, domain_whitelist, background_color, font_color, font_family, font_size, background_image_url, modal_background_color, modal_font_color, modal_border_color, sidebar_color, login_background_color, login_form_background_color, login_font_color, login_button_color, login_logo_url) FROM stdin;
1		/uploads/logos/company_logo.png	#030104	60	{}	#291f3d	#ffffff	'Verdana', sans-serif	21	/uploads/background/background.jpg	#7b5a14	#f2b55f	#292424	#230453	#2874e6	#289ae2	#fafafa	#170a80	/uploads/logos/login_logo.svg
\.


--
-- Data for Name: templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.templates (id, name, base_model, login_background_url, logo_url, primary_color, font_size, promo_video_url, login_type, font_color, prelogin_banner_id) FROM stdin;
7	Template GB 3	V1	\N	\N	#cbd9e7	\N	\N	cadastro_completo	#010713	\N
\.


--
-- Data for Name: ticket_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_messages (id, ticket_id, user_id, message, created_at) FROM stdin;
1	3	20	excluir todos os usuarios	2025-11-03 23:35:19.144986-03
2	3	1	qual motivo?	2025-11-03 23:43:28.86688-03
3	3	20	pedido do usuario	2025-11-03 23:44:28.109755-03
18	18	20	dasdsadas	2025-11-04 19:12:40.523848-03
19	18	20	ola	2025-11-04 19:13:19.33809-03
20	19	16	sdfsdfds	2025-11-04 19:14:54.342291-03
21	19	16	opa	2025-11-04 19:15:04.195543-03
22	20	20	dsdsad	2025-11-04 19:17:51.350024-03
23	19	16	ola	2025-11-04 19:19:56.832863-03
24	21	20	asdsadasdasd	2025-11-04 19:27:18.88879-03
25	21	20	ops	2025-11-04 19:27:28.951521-03
26	21	20	opa	2025-11-04 19:27:50.278816-03
27	21	20	opa	2025-11-04 19:28:13.041716-03
28	20	20	klo	2025-11-04 19:29:30.88669-03
29	20	20	lop	2025-11-04 19:29:46.182593-03
30	18	20	cdfre	2025-11-04 19:30:37.441726-03
31	21	20	cvr	2025-11-04 19:30:50.653807-03
32	20	20	wsxd	2025-11-04 19:30:57.096138-03
33	22	16	cvb	2025-11-04 19:31:40.783602-03
34	20	20	cdfre	2025-11-04 19:33:44.974128-03
35	23	21	dsdsdasd	2025-11-04 19:59:47.852533-03
36	24	20	sadasdsadasd	2025-11-04 20:00:53.590078-03
39	22	21	olar	2025-11-04 20:44:15.690481-03
40	27	20	novo tiket teste	2025-11-04 20:45:51.565244-03
41	28	1	aberto pelo master	2025-11-04 20:52:13.358877-03
42	29	1	czxxz	2025-11-04 20:56:01.517438-03
43	29	21	olp	2025-11-04 20:58:59.790732-03
44	30	20	dcfvtg	2025-11-04 21:04:20.039766-03
45	30	16	ok, solicitação atendida	2025-11-04 21:05:17.695931-03
46	31	20	remover	2025-11-04 21:28:00.17769-03
47	31	20	ou\n	2025-11-04 21:45:06.371748-03
48	31	20	dasdasdas	2025-11-04 21:45:11.846958-03
49	31	20	qwwqewqewqe	2025-11-04 21:45:14.72306-03
50	31	20	eqweqweqw	2025-11-04 21:45:17.189655-03
51	31	20	asdsadas	2025-11-04 21:45:19.412498-03
52	31	20	wqewqeqwe	2025-11-04 21:45:22.245464-03
53	31	20	dsadsadsa	2025-11-04 21:45:26.711009-03
54	32	16	rewrewrewr	2025-11-04 22:10:44.425497-03
55	33	16	qweqweqwewq	2025-11-04 22:10:48.523978-03
56	34	16	qwewq	2025-11-04 22:10:53.286016-03
57	35	16	qweqweqw	2025-11-04 22:10:57.558823-03
58	36	16	eqweqweqw	2025-11-04 22:11:02.388479-03
59	36	1	gdfgdfgdfg	2025-11-04 23:08:28.670963-03
60	36	16	<div>oi<br><br></div>	2025-11-05 10:52:49.066593-03
61	36	16	<div></div>	2025-11-05 11:43:50.507196-03
62	36	16	<div></div>	2025-11-05 11:51:01.670593-03
63	36	16	<div></div>	2025-11-05 11:53:32.508192-03
64	36	16	<div></div>	2025-11-05 13:52:40.04302-03
65	36	16	<div></div>	2025-11-05 15:03:01.560296-03
66	35	16	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;Captura de tela 2025-09-24 220529.png&quot;,&quot;filesize&quot;:99746,&quot;height&quot;:496,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367050713-997031074.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367050713-997031074.png&quot;,&quot;width&quot;:874}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367050713-997031074.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367050713-997031074.png" width="874" height="496"><figcaption class="attachment__caption"><span class="attachment__name">Captura de tela 2025-09-24 220529.png</span> <span class="attachment__size">97.41 KB</span></figcaption></a></figure></div>	2025-11-05 15:24:11.335644-03
67	35	21	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;Captura de tela 2025-10-13 220132.png&quot;,&quot;filesize&quot;:26670,&quot;height&quot;:431,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367212916-260327573.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367212916-260327573.png&quot;,&quot;width&quot;:533}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367212916-260327573.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762367212916-260327573.png" width="533" height="431"><figcaption class="attachment__caption"><span class="attachment__name">Captura de tela 2025-10-13 220132.png</span> <span class="attachment__size">26.04 KB</span></figcaption></a></figure></div>	2025-11-05 15:26:52.74014-03
68	35	21	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;Captura de tela 2025-10-13 225214.png&quot;,&quot;filesize&quot;:29744,&quot;height&quot;:443,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762371791426-56320324.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762371791426-56320324.png&quot;,&quot;width&quot;:472}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762371791426-56320324.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762371791426-56320324.png" width="472" height="443"><figcaption class="attachment__caption"><span class="attachment__name">Captura de tela 2025-10-13 225214.png</span> <span class="attachment__size">29.05 KB</span></figcaption></a></figure></div>	2025-11-05 16:43:09.353868-03
69	36	21	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;Captura de tela 2025-10-21 233649.png&quot;,&quot;filesize&quot;:19518,&quot;height&quot;:118,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372200067-92599611.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372200067-92599611.png&quot;,&quot;width&quot;:1133}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372200067-92599611.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372200067-92599611.png" width="1133" height="118"><figcaption class="attachment__caption"><span class="attachment__name">Captura de tela 2025-10-21 233649.png</span> <span class="attachment__size">19.06 KB</span></figcaption></a></figure></div>	2025-11-05 16:49:57.489015-03
70	37	20	<div>dsdsdsdsd<figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;Captura de tela 2025-10-24 234434.png&quot;,&quot;filesize&quot;:30606,&quot;height&quot;:282,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372269515-567952373.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372269515-567952373.png&quot;,&quot;width&quot;:814}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372269515-567952373.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762372269515-567952373.png" width="814" height="282"><figcaption class="attachment__caption"><span class="attachment__name">Captura de tela 2025-10-24 234434.png</span> <span class="attachment__size">29.89 KB</span></figcaption></a></figure>sa</div>	2025-11-05 16:51:05.252408-03
71	38	16	<div>tht teste</div>	2025-11-05 19:28:46.352841-03
74	41	16	<div>ticket teste</div>	2025-11-05 19:38:14.193841-03
75	42	20	<div>tkt teste ticket SiG Hotspot</div>	2025-11-05 19:39:47.382301-03
76	43	1	<div>tkt teste</div>	2025-11-05 19:40:59.834184-03
77	44	1	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;image.png&quot;,&quot;filesize&quot;:64851,&quot;height&quot;:587,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png&quot;,&quot;width&quot;:703}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png" width="703" height="587"><figcaption class="attachment__caption"><span class="attachment__name">image.png</span> <span class="attachment__size">63.33 KB</span></figcaption></a></figure></div>	2025-11-05 22:02:33.779581-03
78	45	1	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;image.png&quot;,&quot;filesize&quot;:64851,&quot;height&quot;:587,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png&quot;,&quot;width&quot;:703}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762391020193-367602877.png" width="703" height="587"><figcaption class="attachment__caption"><span class="attachment__name">image.png</span> <span class="attachment__size">63.33 KB</span></figcaption></a></figure></div>	2025-11-05 22:03:35.353198-03
79	46	20	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/png&quot;,&quot;filename&quot;:&quot;vencedor sem aparecer nome.png&quot;,&quot;filesize&quot;:8621,&quot;height&quot;:62,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762396086123-155241184.png&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762396086123-155241184.png&quot;,&quot;width&quot;:1002}" data-trix-content-type="image/png" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--png"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762396086123-155241184.png"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762396086123-155241184.png" width="1002" height="62"><figcaption class="attachment__caption"><span class="attachment__name">vencedor sem aparecer nome.png</span> <span class="attachment__size">8.42 KB</span></figcaption></a></figure></div>	2025-11-05 23:27:47.850254-03
80	47	21	<div>gostaria de solicitar uma conta no sistema de administração hotspot</div>	2025-11-09 19:08:22.374043-03
81	48	21	<div>gostaria de solicitar uma conta no sistema de administração hotspot</div>	2025-11-09 19:08:30.846847-03
82	48	1	<div><a href="https://www.google.com.br">www.google.com.br</a></div>	2025-11-09 22:42:43.146471-03
83	48	1	<div><a href="https://www.google.com.br">www.google.com.br</a></div>	2025-11-09 22:42:45.212067-03
84	48	1	<div><a href="https://www.google.com.br">www.google.com.br</a></div>	2025-11-09 22:42:54.843734-03
85	48	1	<div></div>	2025-11-09 22:43:26.263733-03
86	48	1	<div></div>	2025-11-09 22:44:05.099647-03
87	48	1	<div><figure data-trix-attachment="{&quot;contentType&quot;:&quot;image/jpeg&quot;,&quot;filename&quot;:&quot;5040007.jpg&quot;,&quot;filesize&quot;:262918,&quot;height&quot;:2000,&quot;href&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762739075357-424783413.jpg&quot;,&quot;url&quot;:&quot;http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762739075357-424783413.jpg&quot;,&quot;width&quot;:3000}" data-trix-content-type="image/jpeg" data-trix-attributes="{&quot;presentation&quot;:&quot;gallery&quot;}" class="attachment attachment--preview attachment--jpg"><a href="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762739075357-424783413.jpg"><img src="http://127.0.0.1:3000/uploads/ticket_attachments/attachment-1762739075357-424783413.jpg" width="3000" height="2000"><figcaption class="attachment__caption"><span class="attachment__name">5040007.jpg</span> <span class="attachment__size">256.76 KB</span></figcaption></a></figure><br><br><br></div>	2025-11-09 22:44:42.246152-03
88	48	1	<div>oi<br><br></div>	2025-11-09 22:56:44.533373-03
\.


--
-- Data for Name: ticket_ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket_ratings (id, ticket_id, user_id, rating, comment, created_at) FROM stdin;
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tickets (id, ticket_number, title, status, created_by_user_id, assigned_to_user_id, created_at, updated_at) FROM stdin;
31	041120252128-31	pedido de remover	open	20	16	2025-11-04 21:28:00.17769-03	2025-11-04 21:47:47.925749-03
22	041120251931-22	sderf	closed	16	\N	2025-11-04 19:31:40.783602-03	2025-11-04 22:07:05.253871-03
3	031120252335-3	pedido de exclusão	closed	20	16	2025-11-03 23:35:19.144986-03	2025-11-03 23:49:25.785345-03
32	041120252211-32	wrewrew	open	16	\N	2025-11-04 22:10:44.425497-03	2025-11-04 22:10:44.425497-03
19	041120251915-19	fdfdsf	closed	16	\N	2025-11-04 19:14:54.342291-03	2025-11-04 19:31:29.698781-03
33	041120252211-33	ewqewqe	open	16	\N	2025-11-04 22:10:48.523978-03	2025-11-04 22:10:48.523978-03
34	041120252211-34	ewqeqweqw	open	16	\N	2025-11-04 22:10:53.286016-03	2025-11-04 22:10:53.286016-03
23	041120252000-23	ticket teste de tag	closed	21	\N	2025-11-04 19:59:47.852533-03	2025-11-04 20:00:19.466661-03
48	091120251908-48	Pedido de cadstro	open	21	\N	2025-11-09 19:08:30.846847-03	2025-11-09 22:56:44.533373-03
28	041120252052-28	ticket etste	open	1	21	2025-11-04 20:52:13.358877-03	2025-11-04 20:52:18.377297-03
29	041120252056-29	dsd	open	1	16	2025-11-04 20:56:01.517438-03	2025-11-04 20:59:12.075869-03
27	041120252046-27	ticket etste	closed	20	\N	2025-11-04 20:45:51.565244-03	2025-11-04 21:01:42.545592-03
20	041120251918-20	sadasdasdas	closed	20	19	2025-11-04 19:17:51.350024-03	2025-11-04 21:01:57.2356-03
21	041120251927-21	dsadasd	closed	20	21	2025-11-04 19:27:18.88879-03	2025-11-04 21:03:34.279508-03
18	041120251912-18	ticket etste	closed	20	\N	2025-11-04 19:12:40.523848-03	2025-11-04 21:03:38.768644-03
24	041120252001-24	dsdasd	closed	20	\N	2025-11-04 20:00:53.590078-03	2025-11-04 21:03:44.920495-03
35	041120252211-35	eqweqw	open	16	\N	2025-11-04 22:10:57.558823-03	2025-11-05 16:43:09.353868-03
36	041120252211-36	eqwewqeqw	open	16	\N	2025-11-04 22:11:02.388479-03	2025-11-05 16:49:57.489015-03
30	041120252104-30	rtbf	closed	20	16	2025-11-04 21:04:20.039766-03	2025-11-04 21:05:21.347521-03
37	051120251651-37	dsdsdsds	open	20	16	2025-11-05 16:51:05.252408-03	2025-11-05 16:51:46.89781-03
38	051120251928-38	novo ticket teste	open	16	\N	2025-11-05 19:28:46.352841-03	2025-11-05 19:28:46.352841-03
41	051120251938-41	oque acham de SIG Hotspot?	open	16	\N	2025-11-05 19:38:14.193841-03	2025-11-05 19:38:14.193841-03
42	051120251940-42	tkt teste ticket SiG Hotspot	open	20	\N	2025-11-05 19:39:47.382301-03	2025-11-05 19:39:47.382301-03
43	051120251941-43	tht teste SiG Hotspot	open	1	\N	2025-11-05 19:40:59.834184-03	2025-11-05 19:40:59.834184-03
44	051120252203-44	Problemas no sorteio	open	1	\N	2025-11-05 22:02:33.779581-03	2025-11-05 22:02:33.779581-03
45	051120252203-45	Problemas no sorteio	open	1	\N	2025-11-05 22:03:35.353198-03	2025-11-05 22:03:35.353198-03
46	051120252328-46	novo teste	open	20	\N	2025-11-05 23:27:47.850254-03	2025-11-05 23:27:47.850254-03
47	091120251908-47	Pedido de cadstro	open	21	\N	2025-11-09 19:08:22.374043-03	2025-11-09 19:08:22.374043-03
\.


--
-- Data for Name: userdetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.userdetails (id, username, nome_completo, telefone, mac_address, router_name, data_cadastro, ultimo_login, accepts_marketing) FROM stdin;
2	segundoemail@email.com	Nova campanha 	73946187258	C6:5F:DF:84:7C:55	CS-0008085	2025-10-17 19:28:08.577261-03	\N	f
3	terceiroemail@email.com	Segundo email	79908624587	A6:E1:31:34:15:92	CS-008085	2025-10-17 21:37:01.786317-03	\N	f
4	maria.silva@email.com	Maria Silva	71986541230	00:E0:4D:1C:01:01	RT-000001	2025-01-05 10:15:22-03	\N	f
5	joao.souza@email.com	João Souza	71988891230	A0:B1:C2:D3:E4:11	MK-000002	2025-01-06 14:33:12-03	\N	f
6	carla.ferreira@email.com	Carla Ferreira	11992458741	C6:5F:DF:84:7C:01	VM-000003	2025-01-07 08:11:59-03	\N	f
7	luiz.mendes@email.com	Luiz Mendes	31988741256	DE:AD:BE:EF:00:01	GB-000004	2025-01-08 19:25:44-03	\N	f
8	patricia.rocha@email.com	Patrícia Rocha	71945687412	00:E0:4D:1C:01:02	CS-000005	2025-01-09 21:50:12-03	\N	f
9	renato.almeida@email.com	Renato Almeida	71984561230	A0:B1:C2:D3:E4:12	VIP-000006	2025-01-10 17:22:01-03	\N	f
10	davi.santos@email.com	Davi Santos	71996548752	C6:5F:DF:84:7C:02	EB-000007	2025-01-11 09:14:21-03	\N	f
12	rodrigo.pereira@email.com	Rodrigo Pereira	71988963214	00:E0:4D:1C:01:03	MK-000009	2025-01-13 20:11:49-03	\N	f
13	camila.ribeiro@email.com	Camila Ribeiro	71987456920	A0:B1:C2:D3:E4:13	VM-000010	2025-01-14 06:58:12-03	\N	f
14	lucas.barros@email.com	Lucas Barros	71995471230	C6:5F:DF:84:7C:03	GB-000011	2025-01-15 12:31:47-03	\N	f
15	flavia.nogueira@email.com	Flávia Nogueira	71988542147	DE:AD:BE:EF:00:03	CS-000012	2025-01-16 21:10:02-03	\N	f
16	jose.costa@email.com	José Costa	71996587412	00:E0:4D:1C:01:04	VIP-000013	2025-01-17 13:41:58-03	\N	f
17	sara.machado@email.com	Sara Machado	71984569874	A0:B1:C2:D3:E4:14	EB-000014	2025-01-18 22:55:07-03	\N	f
18	marcos.teixeira@email.com	Marcos Teixeira	71999988774	C6:5F:DF:84:7C:04	RT-000015	2025-01-19 09:25:36-03	\N	f
19	bruna.bispo@email.com	Bruna Bispo	71988654127	DE:AD:BE:EF:00:04	MK-000016	2025-01-20 18:41:02-03	\N	f
20	felipe.farias@email.com	Felipe Farias	71988745124	00:E0:4D:1C:01:05	VM-000017	2025-01-21 10:54:22-03	\N	f
21	tatiane.lopes@email.com	Tatiane Lopes	71987459652	A0:B1:C2:D3:E4:15	GB-000018	2025-01-22 11:45:01-03	\N	f
22	cristiano.barbosa@email.com	Cristiano Barbosa	71989632541	C6:5F:DF:84:7C:05	CS-000019	2025-01-23 16:21:18-03	\N	f
23	valeria.paz@email.com	Valéria Paz	71987456988	DE:AD:BE:EF:00:05	VIP-000020	2025-01-24 19:14:50-03	\N	f
24	murilo.prado@email.com	Murilo Prado	71988945625	00:E0:4D:1C:01:06	EB-000021	2025-01-25 07:12:36-03	\N	f
25	helena.cardoso@email.com	Helena Cardoso	71999987412	A0:B1:C2:D3:E4:16	RT-000022	2025-01-26 15:58:21-03	\N	f
26	tiago.silveira@email.com	Tiago Silveira	71987456933	C6:5F:DF:84:7C:06	MK-000023	2025-01-27 11:44:55-03	\N	f
27	karla.batista@email.com	Karla Batista	71996587423	DE:AD:BE:EF:00:06	VM-000024	2025-01-28 22:01:37-03	\N	f
28	igor.menezes@email.com	Igor Menezes	71988745633	00:E0:4D:1C:01:07	GB-000025	2025-01-29 17:55:06-03	\N	f
30	roberto.lima@email.com	Roberto Lima	71988562314	C6:5F:DF:84:7C:07	VIP-000027	2025-01-31 08:33:15-03	\N	f
32	thiago.ventura@email.com	Thiago Ventura	71996541258	00:E0:4D:1C:01:08	RT-000029	2025-02-02 18:29:11-03	\N	f
33	amanda.freitas@email.com	Amanda Freitas	71988563214	A0:B1:C2:D3:E4:18	MK-000030	2025-02-03 14:09:48-03	\N	f
\.


--
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 22, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 657, true);


--
-- Name: authorized_domains_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.authorized_domains_id_seq', 6, true);


--
-- Name: banners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.banners_id_seq', 13, true);


--
-- Name: campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaigns_id_seq', 11, true);


--
-- Name: data_exclusion_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.data_exclusion_requests_id_seq', 6, true);


--
-- Name: nas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nas_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: radius
--

SELECT pg_catalog.setval('public.notifications_id_seq', 132, true);


--
-- Name: radacct_radacctid_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radacct_radacctid_seq', 38, true);


--
-- Name: radcheck_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radcheck_id_seq', 28, true);


--
-- Name: radgroupcheck_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radgroupcheck_id_seq', 1, false);


--
-- Name: radgroupreply_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radgroupreply_id_seq', 1, false);


--
-- Name: radpostauth_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radpostauth_id_seq', 60, true);


--
-- Name: radreply_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radreply_id_seq', 1, false);


--
-- Name: radusergroup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.radusergroup_id_seq', 1, false);


--
-- Name: raffle_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.raffle_participants_id_seq', 297, true);


--
-- Name: raffles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.raffles_id_seq', 16, true);


--
-- Name: rotahotspot_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rotahotspot_details_id_seq', 1, false);


--
-- Name: router_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.router_groups_id_seq', 17, true);


--
-- Name: routers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.routers_id_seq', 15, true);


--
-- Name: templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.templates_id_seq', 7, true);


--
-- Name: ticket_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ticket_messages_id_seq', 88, true);


--
-- Name: ticket_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ticket_ratings_id_seq', 1, false);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.tickets_id_seq', 48, true);


--
-- Name: userdetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.userdetails_id_seq', 33, true);


--
-- Name: admin_users admin_users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_email_key UNIQUE (email);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: authorized_domains authorized_domains_domain_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorized_domains
    ADD CONSTRAINT authorized_domains_domain_name_key UNIQUE (domain_name);


--
-- Name: authorized_domains authorized_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.authorized_domains
    ADD CONSTRAINT authorized_domains_pkey PRIMARY KEY (id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: data_exclusion_requests data_exclusion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_exclusion_requests
    ADD CONSTRAINT data_exclusion_requests_pkey PRIMARY KEY (id);


--
-- Name: nas nas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nas
    ADD CONSTRAINT nas_pkey PRIMARY KEY (id);


--
-- Name: nasreload nasreload_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nasreload
    ADD CONSTRAINT nasreload_pkey PRIMARY KEY (nasipaddress);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: radius
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission_key);


--
-- Name: radacct radacct_acctuniqueid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radacct
    ADD CONSTRAINT radacct_acctuniqueid_key UNIQUE (acctuniqueid);


--
-- Name: radacct radacct_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radacct
    ADD CONSTRAINT radacct_pkey PRIMARY KEY (radacctid);


--
-- Name: radcheck radcheck_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radcheck
    ADD CONSTRAINT radcheck_pkey PRIMARY KEY (id);


--
-- Name: radgroupcheck radgroupcheck_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radgroupcheck
    ADD CONSTRAINT radgroupcheck_pkey PRIMARY KEY (id);


--
-- Name: radgroupreply radgroupreply_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radgroupreply
    ADD CONSTRAINT radgroupreply_pkey PRIMARY KEY (id);


--
-- Name: radpostauth radpostauth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radpostauth
    ADD CONSTRAINT radpostauth_pkey PRIMARY KEY (id);


--
-- Name: radreply radreply_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radreply
    ADD CONSTRAINT radreply_pkey PRIMARY KEY (id);


--
-- Name: radusergroup radusergroup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.radusergroup
    ADD CONSTRAINT radusergroup_pkey PRIMARY KEY (id);


--
-- Name: raffle_participants raffle_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffle_participants
    ADD CONSTRAINT raffle_participants_pkey PRIMARY KEY (id);


--
-- Name: raffle_participants raffle_participants_raffle_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffle_participants
    ADD CONSTRAINT raffle_participants_raffle_id_user_id_key UNIQUE (raffle_id, user_id);


--
-- Name: raffles raffles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffles
    ADD CONSTRAINT raffles_pkey PRIMARY KEY (id);


--
-- Name: raffles raffles_raffle_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffles
    ADD CONSTRAINT raffles_raffle_number_key UNIQUE (raffle_number);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_name, permission_key);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_name);


--
-- Name: rotahotspot_details rotahotspot_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotahotspot_details
    ADD CONSTRAINT rotahotspot_details_pkey PRIMARY KEY (id);


--
-- Name: rotahotspot_details rotahotspot_details_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotahotspot_details
    ADD CONSTRAINT rotahotspot_details_username_key UNIQUE (username);


--
-- Name: router_groups router_groups_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.router_groups
    ADD CONSTRAINT router_groups_name_key UNIQUE (name);


--
-- Name: router_groups router_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.router_groups
    ADD CONSTRAINT router_groups_pkey PRIMARY KEY (id);


--
-- Name: routers routers_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT routers_name_key UNIQUE (name);


--
-- Name: routers routers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT routers_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: templates templates_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_name_key UNIQUE (name);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: ticket_ratings ticket_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_pkey PRIMARY KEY (id);


--
-- Name: ticket_ratings ticket_ratings_ticket_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_ticket_id_key UNIQUE (ticket_id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_ticket_number_key UNIQUE (ticket_number);


--
-- Name: userdetails userdetails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userdetails
    ADD CONSTRAINT userdetails_pkey PRIMARY KEY (id);


--
-- Name: userdetails userdetails_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userdetails
    ADD CONSTRAINT userdetails_username_key UNIQUE (username);


--
-- Name: idx_role_permissions_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_key ON public.role_permissions USING btree (permission_key);


--
-- Name: idx_role_permissions_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_role_permissions_role ON public.role_permissions USING btree (role_name);


--
-- Name: nas_nasname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX nas_nasname ON public.nas USING btree (nasname);


--
-- Name: radacct_active_session_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radacct_active_session_idx ON public.radacct USING btree (acctuniqueid) WHERE (acctstoptime IS NULL);


--
-- Name: radacct_bulk_close; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radacct_bulk_close ON public.radacct USING btree (nasipaddress, acctstarttime) WHERE (acctstoptime IS NULL);


--
-- Name: radacct_calss_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radacct_calss_idx ON public.radacct USING btree (class);


--
-- Name: radacct_start_user_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radacct_start_user_idx ON public.radacct USING btree (acctstarttime, username);


--
-- Name: radcheck_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radcheck_username ON public.radcheck USING btree (username, attribute);


--
-- Name: radgroupcheck_groupname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radgroupcheck_groupname ON public.radgroupcheck USING btree (groupname, attribute);


--
-- Name: radgroupreply_groupname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radgroupreply_groupname ON public.radgroupreply USING btree (groupname, attribute);


--
-- Name: radpostauth_class_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radpostauth_class_idx ON public.radpostauth USING btree (class);


--
-- Name: radpostauth_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radpostauth_username_idx ON public.radpostauth USING btree (username);


--
-- Name: radreply_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radreply_username ON public.radreply USING btree (username, attribute);


--
-- Name: radusergroup_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX radusergroup_username ON public.radusergroup USING btree (username);


--
-- Name: ticket_messages update_ticket_on_new_message_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_ticket_on_new_message_trigger AFTER INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.update_ticket_on_new_message();


--
-- Name: tickets update_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: campaigns campaigns_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id);


--
-- Name: data_exclusion_requests fk_completed_by; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.data_exclusion_requests
    ADD CONSTRAINT fk_completed_by FOREIGN KEY (completed_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: audit_logs fk_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_related_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: radius
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_ticket_id_fkey FOREIGN KEY (related_ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: radius
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: raffle_participants raffle_participants_raffle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffle_participants
    ADD CONSTRAINT raffle_participants_raffle_id_fkey FOREIGN KEY (raffle_id) REFERENCES public.raffles(id) ON DELETE CASCADE;


--
-- Name: raffle_participants raffle_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffle_participants
    ADD CONSTRAINT raffle_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.userdetails(id);


--
-- Name: raffles raffles_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffles
    ADD CONSTRAINT raffles_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.admin_users(id);


--
-- Name: raffles raffles_winner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.raffles
    ADD CONSTRAINT raffles_winner_id_fkey FOREIGN KEY (winner_id) REFERENCES public.userdetails(id);


--
-- Name: role_permissions role_permissions_permission_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_key_fkey FOREIGN KEY (permission_key) REFERENCES public.permissions(permission_key) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_name_fkey FOREIGN KEY (role_name) REFERENCES public.roles(role_name) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: routers routers_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.routers
    ADD CONSTRAINT routers_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.router_groups(id) ON DELETE SET NULL;


--
-- Name: templates templates_prelogin_banner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_prelogin_banner_id_fkey FOREIGN KEY (prelogin_banner_id) REFERENCES public.banners(id) ON DELETE SET NULL;


--
-- Name: ticket_messages ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_messages ticket_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id);


--
-- Name: ticket_ratings ticket_ratings_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_ratings ticket_ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket_ratings
    ADD CONSTRAINT ticket_ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id);


--
-- Name: tickets tickets_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.admin_users(id);


--
-- Name: tickets tickets_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.admin_users(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO radius;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_users TO radius;


--
-- Name: SEQUENCE admin_users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.admin_users_id_seq TO radius;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO radius;


--
-- Name: SEQUENCE audit_logs_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audit_logs_id_seq TO radius;


--
-- Name: TABLE authorized_domains; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.authorized_domains TO radius;


--
-- Name: SEQUENCE authorized_domains_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.authorized_domains_id_seq TO radius;


--
-- Name: TABLE banners; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.banners TO radius;


--
-- Name: SEQUENCE banners_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.banners_id_seq TO radius;


--
-- Name: TABLE campaigns; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.campaigns TO radius;


--
-- Name: SEQUENCE campaigns_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.campaigns_id_seq TO radius;


--
-- Name: TABLE data_exclusion_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.data_exclusion_requests TO radius;


--
-- Name: SEQUENCE data_exclusion_requests_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.data_exclusion_requests_id_seq TO radius;


--
-- Name: TABLE nas; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nas TO radius;


--
-- Name: SEQUENCE nas_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.nas_id_seq TO radius;


--
-- Name: TABLE nasreload; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.nasreload TO radius;


--
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.permissions TO radius;


--
-- Name: TABLE radacct; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.radacct TO radius;


--
-- Name: SEQUENCE radacct_radacctid_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.radacct_radacctid_seq TO radius;


--
-- Name: TABLE radcheck; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.radcheck TO radius;


--
-- Name: SEQUENCE radcheck_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.radcheck_id_seq TO radius;


--
-- Name: TABLE radgroupcheck; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.radgroupcheck TO radius;


--
-- Name: SEQUENCE radgroupcheck_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.radgroupcheck_id_seq TO radius;


--
-- Name: TABLE radgroupreply; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.radgroupreply TO radius;


--
-- Name: SEQUENCE radgroupreply_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.radgroupreply_id_seq TO radius;


--
-- Name: TABLE radpostauth; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.radpostauth TO radius;


--
-- Name: SEQUENCE radpostauth_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.radpostauth_id_seq TO radius;


--
-- Name: TABLE radreply; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.radreply TO radius;


--
-- Name: SEQUENCE radreply_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.radreply_id_seq TO radius;


--
-- Name: TABLE radusergroup; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.radusergroup TO radius;


--
-- Name: SEQUENCE radusergroup_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.radusergroup_id_seq TO radius;


--
-- Name: TABLE raffle_participants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.raffle_participants TO radius;


--
-- Name: SEQUENCE raffle_participants_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.raffle_participants_id_seq TO radius;


--
-- Name: TABLE raffles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.raffles TO radius;


--
-- Name: SEQUENCE raffles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.raffles_id_seq TO radius;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.role_permissions TO radius;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.roles TO radius;


--
-- Name: TABLE rotahotspot_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.rotahotspot_details TO radius;


--
-- Name: SEQUENCE rotahotspot_details_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.rotahotspot_details_id_seq TO radius;


--
-- Name: TABLE router_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.router_groups TO radius;


--
-- Name: SEQUENCE router_groups_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.router_groups_id_seq TO radius;


--
-- Name: TABLE routers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.routers TO radius;


--
-- Name: SEQUENCE routers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.routers_id_seq TO radius;


--
-- Name: TABLE system_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.system_settings TO radius;


--
-- Name: TABLE templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.templates TO radius;


--
-- Name: SEQUENCE templates_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.templates_id_seq TO radius;


--
-- Name: TABLE ticket_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_messages TO radius;


--
-- Name: SEQUENCE ticket_messages_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ticket_messages_id_seq TO radius;


--
-- Name: TABLE ticket_ratings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.ticket_ratings TO radius;


--
-- Name: SEQUENCE ticket_ratings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.ticket_ratings_id_seq TO radius;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tickets TO radius;


--
-- Name: SEQUENCE tickets_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.tickets_id_seq TO radius;


--
-- Name: TABLE userdetails; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.userdetails TO radius;


--
-- Name: SEQUENCE userdetails_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.userdetails_id_seq TO radius;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO radius;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO radius;


--
-- PostgreSQL database dump complete
--

\unrestrict fjU1B9uvKBy4wSe7GfDGlFTdFt8DUAnmZF4QgSqObrTZHPbCHciyoceoaleib9u

