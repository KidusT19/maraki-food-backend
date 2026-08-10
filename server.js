const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const db = require('./db');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '263003067668-905gsnee1qhb06qfse1efc7f5l9ojid6.apps.googleusercontent.com');

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'maraki-food-uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});
const upload = multer({ storage: storage });

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Maraki Food Zones API is running.' });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'customer' } = req.body;
    
    // Check if user exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await db.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, role]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user.rows[0].id, role: user.rows[0].role, restaurant_id: user.rows[0].restaurant_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      token, 
      user: { 
        id: user.rows[0].id, 
        email: user.rows[0].email, 
        name: user.rows[0].name, 
        role: user.rows[0].role,
        restaurant_id: user.rows[0].restaurant_id
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID || '263003067668-905gsnee1qhb06qfse1efc7f5l9ojid6.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Check if user exists
    let userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      // Create user if they don't exist
      // Since it's google, we generate a random dummy password
      const salt = await bcrypt.genSalt(10);
      const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), salt);
      
      const insertResult = await db.query(
        'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [email, randomPassword, name, 'customer']
      );
      userResult = insertResult;
    }

    const user = userResult.rows[0];

    // Create JWT
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role, restaurant_id: user.restaurant_id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ 
      token: jwtToken, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        restaurant_id: user.restaurant_id
      } 
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// Admin/Owner Route to Create Drivers
app.post('/api/auth/register-driver', authMiddleware, async (req, res) => {
  try {
    // Only restaurant owners can create drivers
    if (req.user.role !== 'restaurant') {
      return res.status(403).json({ error: 'Forbidden. Only restaurant owners can create drivers.' });
    }

    const { email, password, name } = req.body;
    
    // Check if user exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user as driver
    const newUser = await db.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, hashedPassword, name, 'driver']
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

const crypto = require('crypto');

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Don't leak that user doesn't exist for security reasons
      return res.json({ message: 'If that email is registered, a password reset link has been generated.' });
    }
    const user = userResult.rows[0];
    
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour from now
    
    await db.query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [token, expires, user.id]);
    
    // Simulate sending email by returning the reset URL
    const resetUrl = `http://192.168.1.4:3001/reset-password?token=${token}`;
    
    res.json({ 
      message: 'Password reset link generated successfully.',
      simulated_email_link: resetUrl 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const userResult = await db.query('SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > $2', [token, Date.now()]);
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }
    
    const user = userResult.rows[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await db.query('UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [hashedPassword, user.id]);
    
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});



app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { newName, newEmail, newPassword } = req.body;
    
    // If email is changing, check for duplicates
    if (newEmail) {
      const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, req.user.id]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email is already in use' });
      }
    }

    let query = 'UPDATE users SET ';
    let params = [];
    let setClauses = [];
    
    if (newName) {
      params.push(newName);
      setClauses.push(`name = $${params.length}`);
    }

    if (newEmail) {
      params.push(newEmail);
      setClauses.push(`email = $${params.length}`);
    }
    
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      params.push(hashedPassword);
      setClauses.push(`password = $${params.length}`);
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    query += setClauses.join(', ');
    params.push(req.user.id);
    query += ` WHERE id = $${params.length} RETURNING id, email, name, role, restaurant_id`;
    
    const result = await db.query(query, params);
    
    // We optionally return the updated user object so the frontend can update state
    res.json({ message: 'Profile updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restaurant Routes
app.get('/api/restaurants', async (req, res) => {
  try {
    const restaurants = await db.query('SELECT * FROM restaurants ORDER BY rating DESC');
    res.json(restaurants.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/restaurants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = await db.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    
    if (restaurant.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const menuItems = await db.query('SELECT * FROM menu_items WHERE restaurant_id = $1', [id]);
    
    res.json({
      ...restaurant.rows[0],
      menu_items: menuItems.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/restaurants/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const reviews = await db.query(`
      SELECT r.*, u.name as user_name 
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.restaurant_id = $1
      ORDER BY r.created_at DESC
    `, [id]);
    res.json(reviews.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reviews', authMiddleware, async (req, res) => {
  try {
    const { restaurant_id, order_id, rating, comment } = req.body;
    const user_id = req.user.id;

    await db.query('BEGIN');
    
    await db.query(
      'INSERT INTO reviews (user_id, restaurant_id, order_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
      [user_id, restaurant_id, order_id, rating, comment]
    );

    await db.query('UPDATE orders SET is_rated = 1 WHERE id = $1', [order_id]);

    const avgResult = await db.query('SELECT AVG(rating) as avg_rating FROM reviews WHERE restaurant_id = $1', [restaurant_id]);
    let newAvg = parseFloat(avgResult.rows[0].avg_rating || 0).toFixed(1);
    
    await db.query('UPDATE restaurants SET rating = $1 WHERE id = $2', [newAvg, restaurant_id]);

    await db.query('COMMIT');
    res.status(201).json({ message: 'Review submitted successfully', newRating: newAvg });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Menu Management Routes
app.post('/api/menu_items', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, is_available } = req.body;
    const image_url = req.file ? req.file.path : null;
    const restaurant_id = req.user.restaurant_id;
    const available = is_available === 'false' ? 0 : 1;

    if (!restaurant_id) return res.status(403).json({ error: 'Not a restaurant owner' });

    const newItem = await db.query(
      'INSERT INTO menu_items (restaurant_id, name, description, price, image_url, is_available) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [restaurant_id, name, description, price, image_url, available]
    );
    res.status(201).json(newItem.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/menu_items/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, is_available } = req.body;
    const restaurant_id = req.user.restaurant_id;
    const available = is_available === 'false' ? 0 : 1;

    let updateQuery = 'UPDATE menu_items SET name = $1, description = $2, price = $3, is_available = $4';
    let params = [name, description, price, available];

    if (req.file) {
      updateQuery += ', image_url = $5';
      params.push(req.file.path);
      params.push(id, restaurant_id);
      updateQuery += ' WHERE id = $6 AND restaurant_id = $7 RETURNING *';
    } else {
      params.push(id, restaurant_id);
      updateQuery += ' WHERE id = $5 AND restaurant_id = $6 RETURNING *';
    }

    const updatedItem = await db.query(updateQuery, params);
    
    if (updatedItem.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }
    res.json(updatedItem.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/menu_items/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const restaurant_id = req.user.restaurant_id;

    const result = await db.query('DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2 RETURNING *', [id, restaurant_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Order Routes
app.post('/api/orders', upload.single('receipt'), async (req, res) => {
  try {
    const { user_id, restaurant_id, total_amount, transaction_id, delivery_address, customer_phone } = req.body;
    let items = req.body.items;
    
    // items will be a string if sent via FormData
    if (typeof items === 'string') {
      items = JSON.parse(items);
    }
    
    const receipt_screenshot = req.file ? req.file.path : null;

    // Begin transaction
    await db.query('BEGIN');
    
    const newOrder = await db.query(
      'INSERT INTO orders (user_id, restaurant_id, total_amount, status, transaction_id, receipt_screenshot, delivery_address, customer_phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [user_id || 1, restaurant_id, total_amount, 'pending', transaction_id, receipt_screenshot, delivery_address, customer_phone]
    );
    const orderId = newOrder.rows[0].id;

    for (let item of items) {
      await db.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.menu_item_id, item.quantity, item.price]
      );
    }
    
    await db.query('COMMIT');
    res.status(201).json(newOrder.rows[0]);
  } catch (error) {
    await db.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;
    const ordersResult = await db.query(`
      SELECT o.*, r.name as restaurant_name 
      FROM orders o 
      LEFT JOIN restaurants r ON o.restaurant_id = r.id 
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [user_id]);
    
    const orders = ordersResult.rows;
    
    // Fetch items for each order
    for (let order of orders) {
      const itemsResult = await db.query(`
        SELECT oi.quantity, oi.price, m.name
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = $1
      `, [order.id]);
      order.items = itemsResult.rows;
    }
    
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/restaurant', authMiddleware, async (req, res) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    if (!restaurant_id) {
      return res.status(403).json({ error: 'User is not linked to a restaurant' });
    }

    const ordersResult = await db.query(`
      SELECT o.*, r.name as restaurant_name, u.name as customer_name
      FROM orders o 
      LEFT JOIN restaurants r ON o.restaurant_id = r.id 
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.restaurant_id = $1
      ORDER BY o.created_at DESC
    `, [restaurant_id]);
    
    const orders = ordersResult.rows;
    for (let order of orders) {
      const itemsResult = await db.query(`
        SELECT oi.quantity, oi.price, m.name
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = $1
      `, [order.id]);
      order.items = itemsResult.rows;
    }
    
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/restaurant/analytics', authMiddleware, async (req, res) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    if (!restaurant_id) {
      return res.status(403).json({ error: 'User is not linked to a restaurant' });
    }

    const revenueResult = await db.query(`
      SELECT SUM(total_amount) as total_revenue, COUNT(id) as total_orders
      FROM orders
      WHERE restaurant_id = $1 AND status = 'delivered'
    `, [restaurant_id]);

    const activeOrdersResult = await db.query(`
      SELECT COUNT(id) as active_orders
      FROM orders
      WHERE restaurant_id = $1 AND status NOT IN ('delivered', 'rejected')
    `, [restaurant_id]);

    const popularDishesResult = await db.query(`
      SELECT m.name, SUM(oi.quantity) as total_sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE o.restaurant_id = $1 AND o.status = 'delivered'
      GROUP BY m.id, m.name
      ORDER BY total_sold DESC
      LIMIT 5
    `, [restaurant_id]);

    res.json({
      revenue: parseFloat(revenueResult.rows[0].total_revenue || 0),
      total_orders: parseInt(revenueResult.rows[0].total_orders || 0),
      active_orders: parseInt(activeOrdersResult.rows[0].active_orders || 0),
      popular_dishes: popularDishesResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/restaurant/customers', authMiddleware, async (req, res) => {
  try {
    const restaurant_id = req.user.restaurant_id;
    if (!restaurant_id) {
      return res.status(403).json({ error: 'User is not linked to a restaurant' });
    }

    const customersResult = await db.query(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        COUNT(o.id) as total_orders, 
        SUM(o.total_amount) as total_spent, 
        MAX(o.created_at) as last_order_date
      FROM users u
      JOIN orders o ON u.id = o.user_id
      WHERE o.restaurant_id = $1
      GROUP BY u.id, u.name, u.email
      ORDER BY total_spent DESC
    `, [restaurant_id]);

    res.json(customersResult.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders/driver', authMiddleware, async (req, res) => {
  try {
    const driver_id = req.user.id;
    // Drivers should see:
    // 1. Orders that are preparing/ready AND have no driver assigned
    // 2. Orders assigned specifically to them
    const orders = await db.query(`
      SELECT o.*, r.name as restaurant_name, u.name as customer_name
      FROM orders o 
      LEFT JOIN restaurants r ON o.restaurant_id = r.id 
      LEFT JOIN users u ON o.user_id = u.id
      WHERE (o.status IN ('pending', 'preparing', 'ready') AND o.driver_id IS NULL)
         OR (o.driver_id = $1)
      ORDER BY o.created_at DESC
    `, [driver_id]);
    res.json(orders.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id/claim', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const driver_id = req.user.id;
    
    // Driver can only claim if it's currently unassigned
    const result = await db.query(
      'UPDATE orders SET driver_id = $1 WHERE id = $2 AND driver_id IS NULL RETURNING *',
      [driver_id, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Order already claimed or not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Status can be: pending -> preparing -> ready -> on_the_way -> delivered
    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
