INSERT IGNORE INTO order_statuses (status_name) VALUES ('SCHEDULED');
INSERT IGNORE INTO order_statuses (status_name) VALUES ('PROCESSING');

CREATE TABLE time_slots (
    slot_id INT PRIMARY KEY AUTO_INCREMENT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes SMALLINT NOT NULL,
    CONSTRAINT uq_time_slot UNIQUE (start_time, end_time),
    CONSTRAINT chk_time_slot_duration CHECK (duration_minutes IN (15, 30)),
    CONSTRAINT chk_time_slot_range CHECK (end_time > start_time)
);

INSERT INTO time_slots (start_time, end_time, duration_minutes)
WITH RECURSIVE slot_minutes AS (
    SELECT 0 AS start_minute
    UNION ALL
    SELECT start_minute + 15 FROM slot_minutes WHERE start_minute < 1425
)
SELECT SEC_TO_TIME(start_minute * 60),
       SEC_TO_TIME((start_minute + 15) * 60),
       15
FROM slot_minutes;

CREATE TABLE restaurant_capacities (
    restaurant_id INT NOT NULL,
    slot_id INT NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    prep_minutes INT NOT NULL DEFAULT 20,
    buffer_minutes INT NOT NULL DEFAULT 5,
    PRIMARY KEY (restaurant_id, slot_id),
    CONSTRAINT chk_restaurant_capacity CHECK (capacity > 0),
    CONSTRAINT chk_restaurant_prep_minutes CHECK (prep_minutes > 0),
    CONSTRAINT chk_restaurant_buffer_minutes CHECK (buffer_minutes >= 0),
    CONSTRAINT fk_restaurant_capacities_restaurant
        FOREIGN KEY (restaurant_id) REFERENCES restaurants(restaurant_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_restaurant_capacities_slot
        FOREIGN KEY (slot_id) REFERENCES time_slots(slot_id)
        ON DELETE CASCADE
);

INSERT INTO restaurant_capacities
    (restaurant_id, slot_id, capacity, prep_minutes, buffer_minutes)
SELECT restaurant.restaurant_id, slot.slot_id, 4, 20, 5
FROM restaurants restaurant
CROSS JOIN time_slots slot;

ALTER TABLE orders
    ADD COLUMN scheduled_for DATETIME NULL,
    ADD COLUMN scheduled_slot_end DATETIME NULL,
    ADD COLUMN scheduled_trigger_at DATETIME NULL,
    ADD COLUMN scheduled_dispatch_at DATETIME NULL,
    ADD COLUMN scheduled_prep_minutes INT NULL,
    ADD COLUMN scheduled_buffer_minutes INT NULL,
    ADD COLUMN scheduled_travel_seconds INT NULL,
    ADD COLUMN scheduled_distance_meters INT NULL,
    ADD INDEX idx_orders_scheduled_capacity
        (restaurant_id, scheduled_for, status_id),
    ADD INDEX idx_orders_scheduled_trigger
        (status_id, scheduled_trigger_at),
    ADD INDEX idx_orders_scheduled_dispatch
        (status_id, scheduled_dispatch_at);

ALTER TABLE shippers
    ADD COLUMN last_assigned_at DATETIME NULL,
    ADD INDEX idx_shippers_dispatch_availability (status_id, last_assigned_at, shipper_id);
