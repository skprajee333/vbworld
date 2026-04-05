ALTER TABLE warehouse_receipts
    ADD COLUMN purchase_order_id UUID NULL,
    ADD COLUMN purchase_order_item_id UUID NULL;

ALTER TABLE warehouse_receipts
    ADD CONSTRAINT fk_warehouse_receipts_purchase_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id);

ALTER TABLE warehouse_receipts
    ADD CONSTRAINT fk_warehouse_receipts_purchase_order_item
        FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id);

CREATE INDEX idx_warehouse_receipts_purchase_order
    ON warehouse_receipts(purchase_order_id);

CREATE INDEX idx_warehouse_receipts_purchase_order_item
    ON warehouse_receipts(purchase_order_item_id);
