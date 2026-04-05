CREATE TABLE item_recipes (
    id UUID PRIMARY KEY,
    menu_item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    output_quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE item_recipe_ingredients (
    id UUID PRIMARY KEY,
    recipe_id UUID NOT NULL REFERENCES item_recipes(id) ON DELETE CASCADE,
    ingredient_item_id UUID NOT NULL REFERENCES items(id),
    quantity_required NUMERIC(12,3) NOT NULL,
    wastage_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_recipe_ingredient UNIQUE (recipe_id, ingredient_item_id)
);

CREATE TABLE pos_consumption_logs (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES pos_order_items(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES item_recipes(id),
    menu_item_id UUID NOT NULL REFERENCES items(id),
    ingredient_item_id UUID NOT NULL REFERENCES items(id),
    quantity_consumed NUMERIC(12,3) NOT NULL,
    stock_before NUMERIC(12,3) NOT NULL,
    stock_after NUMERIC(12,3) NOT NULL,
    source_event VARCHAR(30) NOT NULL DEFAULT 'KOT',
    consumed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumed_by UUID REFERENCES users(id),
    notes TEXT
);

CREATE INDEX idx_item_recipes_menu_item ON item_recipes(menu_item_id);
CREATE INDEX idx_recipe_ingredients_recipe ON item_recipe_ingredients(recipe_id);
CREATE INDEX idx_pos_consumption_order_item ON pos_consumption_logs(order_item_id);
CREATE INDEX idx_pos_consumption_order ON pos_consumption_logs(order_id);
