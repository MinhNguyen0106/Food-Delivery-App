ALTER TABLE orders
    ADD COLUMN estimated_delivery_minutes INT NULL AFTER delivery_fee,
    ADD CONSTRAINT chk_order_estimated_delivery_minutes
        CHECK (
            estimated_delivery_minutes IS NULL
            OR estimated_delivery_minutes > 0
        );
