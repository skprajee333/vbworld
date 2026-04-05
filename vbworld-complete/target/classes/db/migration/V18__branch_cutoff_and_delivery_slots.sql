ALTER TABLE branches
    ADD COLUMN order_cutoff_time TIME NOT NULL DEFAULT TIME '17:00:00',
    ADD COLUMN order_lead_days INT NOT NULL DEFAULT 1,
    ADD COLUMN default_delivery_slot VARCHAR(20) NOT NULL DEFAULT 'MORNING';

ALTER TABLE indents
    ADD COLUMN requested_delivery_slot VARCHAR(20),
    ADD COLUMN promised_delivery_slot VARCHAR(20),
    ADD COLUMN scheduled_delivery_date DATE,
    ADD COLUMN cutoff_applied BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE indents
SET scheduled_delivery_date = expected_date,
    promised_delivery_slot = 'MORNING'
WHERE scheduled_delivery_date IS NULL;
