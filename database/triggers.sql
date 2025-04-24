-- This SQL script creates triggers for the events and registration tables to handle various business logic.

-- including capacity validation, waitlist processing, and notification generation.
CREATE OR REPLACE FUNCTION validate_event_capacity()
RETURNS trigger AS $$
DECLARE
  current_registrations INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_registrations 
  FROM registration 
  WHERE event_id = NEW.event_id AND status = 'confirmed';
  
  IF (NEW.capacity < current_registrations) THEN
    RAISE EXCEPTION 'Cannot reduce capacity below current registrations (%) for this event', current_registrations;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- automatically moves waitlisted users to confirmed status when capacity increases.
CREATE TRIGGER event_capacity_validation_trigger
BEFORE UPDATE OF capacity ON events
FOR EACH ROW EXECUTE FUNCTION validate_event_capacity();

CREATE OR REPLACE FUNCTION process_waitlist()
RETURNS trigger AS $$
DECLARE
  waitlist_entry RECORD;
  available_spots INTEGER;
BEGIN
  -- Only run when capacity increases
  IF (TG_OP = 'UPDATE' AND NEW.capacity > OLD.capacity) THEN
    available_spots := NEW.capacity - OLD.capacity;
    
    -- Process waitlist entries in order
    FOR waitlist_entry IN 
      SELECT * FROM waitlist 
      WHERE event_id = NEW.event_id AND status = 'waiting'
      ORDER BY request_date ASC
      LIMIT available_spots
    LOOP
      -- Create registration
      INSERT INTO registration (person_id, event_id, status, registration_date)
      VALUES (waitlist_entry.person_id, waitlist_entry.event_id, 'confirmed', CURRENT_TIMESTAMP);
      
      -- Update waitlist entry
      UPDATE waitlist SET status = 'approved' 
      WHERE waitlist_id = waitlist_entry.waitlist_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_waitlist_trigger
AFTER UPDATE OF capacity ON events
FOR EACH ROW EXECUTE FUNCTION process_waitlist();


-- Create a function to check for duplicate emails
CREATE OR REPLACE FUNCTION check_duplicate_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if email already exists
    IF EXISTS (SELECT 1 FROM person WHERE email = NEW.email) THEN
        RAISE EXCEPTION 'Email address % is already registered', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs before insert
CREATE TRIGGER prevent_duplicate_email
BEFORE INSERT ON person
FOR EACH ROW
EXECUTE FUNCTION check_duplicate_email();

--trigger for unique person_id
CREATE OR REPLACE FUNCTION check_duplicate_person_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if person_id already exists
    IF EXISTS (SELECT 1 FROM person WHERE person_id = NEW.person_id) THEN
        RAISE EXCEPTION 'Person ID % is already in use', NEW.person_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that runs before insert
CREATE TRIGGER prevent_duplicate_person_id
BEFORE INSERT ON person
FOR EACH ROW
EXECUTE FUNCTION check_duplicate_person_id();


