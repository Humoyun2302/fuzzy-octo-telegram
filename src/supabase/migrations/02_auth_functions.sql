-- ============================================
-- TRIMLY AUTHENTICATION FUNCTIONS
-- ============================================
-- Run this file SECOND after 01_create_tables.sql
-- Creates password hashing and auth functions
-- ============================================

-- Ensure pgcrypto extension is enabled (for password hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PASSWORD HASHING FUNCTIONS
-- ============================================

-- Function to hash a password using bcrypt
CREATE OR REPLACE FUNCTION public.hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.hash_password IS 'Hash a plain text password using bcrypt';

-- Function to verify a password against a hash
CREATE OR REPLACE FUNCTION public.verify_password(password TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN password_hash = crypt(password, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_password IS 'Verify a plain text password matches the stored hash';

-- ============================================
-- CUSTOMER AUTHENTICATION
-- ============================================

-- Function to create a new customer account
CREATE OR REPLACE FUNCTION public.create_customer(
    p_phone TEXT,
    p_password TEXT,
    p_full_name TEXT
)
RETURNS TABLE(
    id UUID,
    phone TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_customer_id UUID;
    v_phone_clean TEXT;
BEGIN
    -- Clean phone number (remove spaces)
    v_phone_clean := REPLACE(p_phone, ' ', '');
    
    -- Check if phone already exists
    IF EXISTS (SELECT 1 FROM public.customers WHERE phone = v_phone_clean) THEN
        RAISE EXCEPTION 'Phone number already registered';
    END IF;
    
    -- Insert customer with hashed password
    INSERT INTO public.customers (phone, password_hash, full_name)
    VALUES (v_phone_clean, public.hash_password(p_password), p_full_name)
    RETURNING customers.id INTO v_customer_id;
    
    -- Return customer data (without password hash)
    RETURN QUERY
    SELECT c.id, c.phone, c.full_name, c.created_at
    FROM public.customers c
    WHERE c.id = v_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_customer IS 'Create a new customer account with hashed password';

-- Function to authenticate customer
CREATE OR REPLACE FUNCTION public.authenticate_customer(
    p_phone TEXT,
    p_password TEXT
)
RETURNS TABLE(
    id UUID,
    phone TEXT,
    full_name TEXT,
    role TEXT
) AS $$
DECLARE
    v_phone_clean TEXT;
    v_customer RECORD;
BEGIN
    -- Clean phone number
    v_phone_clean := REPLACE(p_phone, ' ', '');
    
    -- Get customer record
    SELECT c.id, c.phone, c.full_name, c.password_hash
    INTO v_customer
    FROM public.customers c
    WHERE c.phone = v_phone_clean;
    
    -- Check if customer exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid phone number or password';
    END IF;
    
    -- Verify password
    IF NOT public.verify_password(p_password, v_customer.password_hash) THEN
        RAISE EXCEPTION 'Invalid phone number or password';
    END IF;
    
    -- Return authenticated customer data
    RETURN QUERY
    SELECT v_customer.id, v_customer.phone, v_customer.full_name, 'customer'::TEXT as role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.authenticate_customer IS 'Authenticate customer with phone and password';

-- ============================================
-- BARBER AUTHENTICATION
-- ============================================

-- Function to create a new barber account
CREATE OR REPLACE FUNCTION public.create_barber(
    p_phone TEXT,
    p_password TEXT,
    p_full_name TEXT
)
RETURNS TABLE(
    id UUID,
    phone TEXT,
    full_name TEXT,
    subscription_status TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    v_barber_id UUID;
    v_phone_clean TEXT;
    v_trial_expiry TIMESTAMPTZ;
BEGIN
    -- Clean phone number (remove spaces)
    v_phone_clean := REPLACE(p_phone, ' ', '');
    
    -- Check if phone already exists
    IF EXISTS (SELECT 1 FROM public.barbers WHERE phone = v_phone_clean) THEN
        RAISE EXCEPTION 'Phone number already registered';
    END IF;
    
    -- Set trial expiry to 14 days from now
    v_trial_expiry := NOW() + INTERVAL '14 days';
    
    -- Insert barber with hashed password and free trial
    INSERT INTO public.barbers (
        phone, 
        password_hash, 
        full_name,
        name,
        subscription_status,
        subscription_plan,
        subscription_expiry_date,
        trial_used
    )
    VALUES (
        v_phone_clean, 
        public.hash_password(p_password), 
        p_full_name,
        p_full_name, -- Set name = full_name by default
        'free_trial',
        'free_trial',
        v_trial_expiry,
        false
    )
    RETURNING barbers.id INTO v_barber_id;
    
    -- Return barber data (without password hash)
    RETURN QUERY
    SELECT b.id, b.phone, b.full_name, b.subscription_status, b.created_at
    FROM public.barbers b
    WHERE b.id = v_barber_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_barber IS 'Create a new barber account with free trial and hashed password';

-- Function to authenticate barber
CREATE OR REPLACE FUNCTION public.authenticate_barber(
    p_phone TEXT,
    p_password TEXT
)
RETURNS TABLE(
    id UUID,
    phone TEXT,
    full_name TEXT,
    subscription_status TEXT,
    role TEXT
) AS $$
DECLARE
    v_phone_clean TEXT;
    v_barber RECORD;
BEGIN
    -- Clean phone number
    v_phone_clean := REPLACE(p_phone, ' ', '');
    
    -- Get barber record
    SELECT b.id, b.phone, b.full_name, b.subscription_status, b.password_hash
    INTO v_barber
    FROM public.barbers b
    WHERE b.phone = v_phone_clean;
    
    -- Check if barber exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid phone number or password';
    END IF;
    
    -- Verify password
    IF NOT public.verify_password(p_password, v_barber.password_hash) THEN
        RAISE EXCEPTION 'Invalid phone number or password';
    END IF;
    
    -- Return authenticated barber data
    RETURN QUERY
    SELECT 
        v_barber.id, 
        v_barber.phone, 
        v_barber.full_name, 
        v_barber.subscription_status,
        'barber'::TEXT as role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.authenticate_barber IS 'Authenticate barber with phone and password';

-- ============================================
-- SESSION MANAGEMENT
-- ============================================

-- Function to create a session
CREATE OR REPLACE FUNCTION public.create_session(
    p_user_id UUID,
    p_role TEXT,
    p_session_token TEXT,
    p_expires_in_hours INTEGER DEFAULT 720 -- 30 days default
)
RETURNS TABLE(
    session_token TEXT,
    expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
    
    -- Insert new session
    INSERT INTO public.sessions (session_token, user_id, role, expires_at)
    VALUES (p_session_token, p_user_id, p_role, v_expires_at);
    
    RETURN QUERY
    SELECT p_session_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_session IS 'Create a new session token';

-- Function to verify a session
CREATE OR REPLACE FUNCTION public.verify_session(p_session_token TEXT)
RETURNS TABLE(
    user_id UUID,
    role TEXT,
    valid BOOLEAN
) AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Get session
    SELECT s.user_id, s.role, s.expires_at
    INTO v_session
    FROM public.sessions s
    WHERE s.session_token = p_session_token;
    
    -- Check if session exists and is not expired
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false;
        RETURN;
    END IF;
    
    IF v_session.expires_at < NOW() THEN
        -- Delete expired session
        DELETE FROM public.sessions WHERE session_token = p_session_token;
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, false;
        RETURN;
    END IF;
    
    -- Session is valid
    RETURN QUERY
    SELECT v_session.user_id, v_session.role, true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_session IS 'Verify a session token is valid and not expired';

-- Function to delete a session (logout)
CREATE OR REPLACE FUNCTION public.delete_session(p_session_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.sessions WHERE session_token = p_session_token;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.delete_session IS 'Delete a session token (logout)';

-- Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM public.sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Delete all expired sessions';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Allow anon role to call auth functions (server will use service role)
GRANT EXECUTE ON FUNCTION public.hash_password TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_password TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_customer TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_customer TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_barber TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authenticate_barber TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_session TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions TO anon, authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Authentication functions created successfully!';
    RAISE NOTICE '🔐 Password hashing: hash_password(), verify_password()';
    RAISE NOTICE '👤 Customer auth: create_customer(), authenticate_customer()';
    RAISE NOTICE '✂️ Barber auth: create_barber(), authenticate_barber()';
    RAISE NOTICE '🎫 Session management: create_session(), verify_session(), delete_session()';
    RAISE NOTICE '🔄 Next step: Run 03_create_view.sql';
END $$;
