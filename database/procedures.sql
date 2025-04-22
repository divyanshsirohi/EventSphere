-- Event Registration Procedure
CREATE OR REPLACE PROCEDURE register_for_event(
    IN p_person_id INTEGER,
    IN p_event_id INTEGER,
    IN p_status VARCHAR DEFAULT 'pending'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_capacity INTEGER;
    v_current_registrations INTEGER;
    v_registration_id INTEGER;
BEGIN
    -- Check if already registered
    PERFORM 1 FROM registration 
    WHERE person_id = p_person_id AND event_id = p_event_id;
    
    IF FOUND THEN
        RAISE EXCEPTION 'User is already registered for this event';
    END IF;
    
    -- Get event capacity and current registration count
    SELECT capacity INTO v_event_capacity 
    FROM events WHERE event_id = p_event_id;
    
    SELECT COUNT(*) INTO v_current_registrations 
    FROM registration 
    WHERE event_id = p_event_id AND status = 'confirmed';
    
    -- Set status to confirmed if space available, otherwise pending
    IF v_current_registrations < v_event_capacity THEN
        p_status := 'confirmed';
    END IF;
    
    -- Create registration
    INSERT INTO registration (person_id, event_id, status, registration_date)
    VALUES (p_person_id, p_event_id, p_status, CURRENT_TIMESTAMP)
    RETURNING reg_id INTO v_registration_id;
    
    -- If confirmed, create payment record
    IF p_status = 'confirmed' THEN
        INSERT INTO payment (reg_id, amount, status)
        SELECT v_registration_id, e.price, 'pending'
        FROM events e WHERE e.event_id = p_event_id;
        
        -- Create notification
        INSERT INTO notification (person_id, message)
        VALUES (p_person_id, 'You have successfully registered for an event. Please complete your payment.');
    ELSE
        -- Create waitlist notification
        INSERT INTO notification (person_id, message)
        VALUES (p_person_id, 'The event is at full capacity. You have been added to the waitlist.');
    END IF;
    
    -- Return the registration status
    RAISE NOTICE 'Registration created with status: %', p_status;
END;
$$;

-- Cancel Registration Procedure
CREATE OR REPLACE PROCEDURE cancel_registration(
    IN p_reg_id INTEGER,
    IN p_person_id INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_event_id INTEGER;
    v_event_name VARCHAR;
BEGIN
    -- Verify registration exists and belongs to the user
    SELECT r.event_id, e.event_name INTO v_event_id, v_event_name
    FROM registration r
    JOIN events e ON r.event_id = e.event_id
    WHERE r.reg_id = p_reg_id AND r.person_id = p_person_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration not found or unauthorized';
    END IF;
    
    -- Update registration status
    UPDATE registration
    SET status = 'cancelled'
    WHERE reg_id = p_reg_id;
    
    -- Create notification
    INSERT INTO notification (person_id, message)
    VALUES (p_person_id, 'Your registration for ' || v_event_name || ' has been cancelled.');
    
    -- Check waitlist and upgrade someone if available
    PERFORM process_waitlist(v_event_id);
END;
$$;

-- Process Waitlist Function
CREATE OR REPLACE FUNCTION process_waitlist(p_event_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_waitlist_reg_id INTEGER;
    v_person_id INTEGER;
    v_event_name VARCHAR;
BEGIN
    -- Get event name
    SELECT event_name INTO v_event_name
    FROM events WHERE event_id = p_event_id;
    
    -- Find the oldest waitlisted registration
    SELECT r.reg_id, r.person_id INTO v_waitlist_reg_id, v_person_id
    FROM registration r
    WHERE r.event_id = p_event_id AND r.status = 'pending'
    ORDER BY r.registration_date ASC
    LIMIT 1;
    
    -- If found, upgrade to confirmed
    IF FOUND THEN
        UPDATE registration
        SET status = 'confirmed'
        WHERE reg_id = v_waitlist_reg_id;
        
        -- Create payment record
        INSERT INTO payment (reg_id, amount, status)
        SELECT v_waitlist_reg_id, e.price, 'pending'
        FROM events e WHERE e.event_id = p_event_id;
        
        -- Notify user
        INSERT INTO notification (person_id, message)
        VALUES (v_person_id, 'Good news! A spot has opened up for ' || v_event_name || '. Your registration is now confirmed.');
    END IF;
END;
$$;

-- Get Event Statistics Function
CREATE OR REPLACE FUNCTION get_event_stats(p_event_id INTEGER)
RETURNS TABLE (
    confirmed_count INTEGER,
    pending_count INTEGER,
    cancelled_count INTEGER,
    total_revenue NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM registration WHERE event_id = p_event_id AND status = 'confirmed'),
        (SELECT COUNT(*) FROM registration WHERE event_id = p_event_id AND status = 'pending'),
        (SELECT COUNT(*) FROM registration WHERE event_id = p_event_id AND status = 'cancelled'),
        COALESCE((
            SELECT SUM(p.amount)
            FROM payment p
            JOIN registration r ON p.reg_id = r.reg_id
            WHERE r.event_id = p_event_id AND p.status = 'completed'
        ), 0);
END;
$$;
