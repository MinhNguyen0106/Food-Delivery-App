ALTER TABLE orders
    ADD COLUMN estimated_delivery_accepted_at DATETIME NULL
        AFTER estimated_delivery_minutes;

UPDATE orders order_record
JOIN order_statuses status
    ON status.status_id = order_record.status_id
SET order_record.estimated_delivery_accepted_at = order_record.updated_at
WHERE status.status_name = 'CONFIRMED';
