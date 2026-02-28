-- Increment event spots on registration
CREATE OR REPLACE FUNCTION public.increment_event_spots(eid UUID)
RETURNS void AS $$
BEGIN
    UPDATE events SET current_spots = current_spots + 1 WHERE id = eid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement event spots on cancellation
CREATE OR REPLACE FUNCTION public.decrement_event_spots(eid UUID)
RETURNS void AS $$
BEGIN
    UPDATE events SET current_spots = GREATEST(current_spots - 1, 0) WHERE id = eid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
