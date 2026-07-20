const pool = require('./db');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    const existing = await pool.query('SELECT tenant_id FROM tenants LIMIT 1');
    if (existing.rows.length > 0) {
      console.log('Database already seeded. Skipping.');
      process.exit();
    }

    const pw = await bcrypt.hash('demo123', 12);

    // --- Tenants ---
    const t1 = await pool.query(
      `INSERT INTO tenants (name, subdomain, owner_name, phone, address, is_active)
       VALUES ('Luigi''s Pizzeria', 'pizzeria-luigi', 'Luigi Hernandez', '(212) 555-0149', '88 Broadway Ave, NY', 1)
       RETURNING tenant_id`
    );
    const t2 = await pool.query(
      `INSERT INTO tenants (name, subdomain, owner_name, phone, address, is_active)
       VALUES ('Sakura Sushi', 'sakura-sushi', 'Hana Tanaka', '(212) 555-0220', '45 Park Ave, NY', 1)
       RETURNING tenant_id`
    );
    const t3 = await pool.query(
      `INSERT INTO tenants (name, subdomain, owner_name, phone, address, is_active)
       VALUES ('Brew & Bean Coffee', 'brew-and-bean', 'Sofia Martinez', '(212) 555-0391', '12 Lexington Ave, NY', 1)
       RETURNING tenant_id`
    );
    const t1id = t1.rows[0].tenant_id;
    const t2id = t2.rows[0].tenant_id;
    const t3id = t3.rows[0].tenant_id;

    // --- Branding ---
    await pool.query(`INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color, logo_text) VALUES ($1, '#E8751A', '#0E9F8E', 'LP')`, [t1id]);
    await pool.query(`INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color, logo_text) VALUES ($1, '#C0392B', '#2C3E50', 'SS')`, [t2id]);
    await pool.query(`INSERT INTO tenant_branding (tenant_id, primary_color, secondary_color, logo_text) VALUES ($1, '#6F4E37', '#D4A017', 'BB')`, [t3id]);

    // --- Users ---
    await pool.query(`INSERT INTO users (tenant_id, email, password, full_name, role) VALUES ($1, 'staff@luigi.com', $2, 'Marco Romano', 'staff')`, [t1id, pw]);
    await pool.query(`INSERT INTO users (tenant_id, email, password, full_name, role) VALUES ($1, 'staff@sakura.com', $2, 'Kenji Tanaka', 'staff')`, [t2id, pw]);
    await pool.query(`INSERT INTO users (tenant_id, email, password, full_name, role) VALUES ($1, 'staff@brewbean.com', $2, 'Sofia Martinez', 'staff')`, [t3id, pw]);
    await pool.query(`INSERT INTO users (tenant_id, email, password, full_name, role) VALUES (NULL, 'admin@coos-lr.com', $1, 'Elihut Hernandez', 'admin')`, [pw]);

    // --- Menu items ---
    const luigiItems = [
      ['Margherita', 'Classic tomato & fresh mozzarella', 12.99, 'Pizza', 'POPULAR'],
      ['Pepperoni', 'Loaded with premium pepperoni', 14.99, 'Pizza', ''],
      ['BBQ Chicken', 'Smoky BBQ with grilled chicken', 15.99, 'Pizza', 'NEW'],
      ['Veggie Supreme', 'Garden-fresh seasonal toppings', 13.99, 'Pizza', ''],
      ['Four Cheese', 'Mozzarella, cheddar, parmesan, gouda', 13.49, 'Pizza', 'CHEF'],
      ['Caesar Salad', 'Romaine, croutons, parmesan', 8.99, 'Salads', ''],
      ['Garlic Bread', 'Toasted with herb butter', 4.99, 'Appetizers', ''],
      ['Tiramisu', 'Classic Italian dessert', 6.99, 'Desserts', ''],
      ['Sparkling Water', 'San Pellegrino 500ml', 3.49, 'Drinks', '']
    ];
    const sakuraItems = [
      ['Salmon Nigiri', 'Fresh Atlantic salmon', 12.99, 'Nigiri', 'POPULAR'],
      ['Dragon Roll', 'Shrimp tempura & avocado', 15.99, 'Rolls', 'CHEF'],
      ['Miso Soup', 'Traditional dashi broth', 4.99, 'Soups', ''],
      ['Edamame', 'Salted steamed soybeans', 5.99, 'Appetizers', '']
    ];
    const brewItems = [
      ['Espresso', 'Double shot, rich & bold', 3.49, 'Espresso', 'POPULAR'],
      ['Cappuccino', 'Espresso, steamed milk & foam', 4.99, 'Espresso', ''],
      ['Caramel Latte', 'Espresso, milk & house caramel syrup', 5.49, 'Espresso', 'NEW'],
      ['Cold Brew', 'Slow-steeped 12-hour cold brew', 4.49, 'Cold Drinks', ''],
      ['Iced Matcha Latte', 'Ceremonial matcha, oat milk', 5.49, 'Cold Drinks', 'CHEF'],
      ['Drip Coffee', 'House blend, freshly brewed', 2.99, 'Hot Drinks', ''],
      ['Chai Latte', 'Spiced chai with steamed milk', 4.99, 'Hot Drinks', ''],
      ['Croissant', 'Buttery, flaky, baked fresh daily', 3.99, 'Pastries', 'POPULAR'],
      ['Blueberry Muffin', 'Bursting with fresh blueberries', 3.49, 'Pastries', ''],
      ['Avocado Toast', 'Sourdough, smashed avocado, chili flakes', 8.99, 'Food', 'NEW'],
      ['Granola Bowl', 'Greek yogurt, honey, seasonal fruit', 7.99, 'Food', '']
    ];

    const insertedLuigiIds = [];
    for (const [name, desc, price, cat, badge] of luigiItems) {
      const r = await pool.query(
        `INSERT INTO menu_items (tenant_id, name, description, price, category, badge, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING item_id`,
        [t1id, name, desc, price, cat, badge]
      );
      insertedLuigiIds.push(r.rows[0].item_id);
    }
    for (const [name, desc, price, cat, badge] of sakuraItems) {
      await pool.query(
        `INSERT INTO menu_items (tenant_id, name, description, price, category, badge, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [t2id, name, desc, price, cat, badge]
      );
    }
    for (const [name, desc, price, cat, badge] of brewItems) {
      await pool.query(
        `INSERT INTO menu_items (tenant_id, name, description, price, category, badge, is_available)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [t3id, name, desc, price, cat, badge]
      );
    }

    // --- Demo orders (Luigi's) ---
    const o1 = await pool.query(
      `INSERT INTO orders (tenant_id, customer_name, customer_phone, delivery_address, special_notes, status, total_amount)
       VALUES ($1, 'Maria Rodriguez', '(212)555-9101', '22 5th Ave, NY', 'Extra cheese', 'Received', 34.97) RETURNING order_id`,
      [t1id]
    );
    const o2 = await pool.query(
      `INSERT INTO orders (tenant_id, customer_name, customer_phone, delivery_address, special_notes, status, total_amount)
       VALUES ($1, 'James Thornton', '(212)555-0182', '88 Park Blvd, NY', 'Nut allergy', 'In-Progress', 21.98) RETURNING order_id`,
      [t1id]
    );
    const o1id = o1.rows[0].order_id;
    const o2id = o2.rows[0].order_id;

    // Pepperoni x2 + Garlic Bread for o1, Margherita + Caesar Salad for o2
    await pool.query(
      `INSERT INTO order_line_items (order_id, item_id, item_name, unit_price, quantity, subtotal) VALUES ($1, $2, 'Pepperoni', 14.99, 2, 29.98)`,
      [o1id, insertedLuigiIds[1]]
    );
    await pool.query(
      `INSERT INTO order_line_items (order_id, item_id, item_name, unit_price, quantity, subtotal) VALUES ($1, $2, 'Garlic Bread', 4.99, 1, 4.99)`,
      [o1id, insertedLuigiIds[6]]
    );
    await pool.query(
      `INSERT INTO order_line_items (order_id, item_id, item_name, unit_price, quantity, subtotal) VALUES ($1, $2, 'Margherita', 12.99, 1, 12.99)`,
      [o2id, insertedLuigiIds[0]]
    );
    await pool.query(
      `INSERT INTO order_line_items (order_id, item_id, item_name, unit_price, quantity, subtotal) VALUES ($1, $2, 'Caesar Salad', 8.99, 1, 8.99)`,
      [o2id, insertedLuigiIds[5]]
    );

    console.log('Seed complete: 3 tenants, 4 users, 24 menu items, 2 demo orders.');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();