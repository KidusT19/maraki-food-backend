-- schema.sql

-- Drop tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS restaurants;
DROP TABLE IF EXISTS users;

-- Users Table (Customers, Admins, Drivers)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Restaurants Table
CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    rating DECIMAL(2,1) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items Table
CREATE TABLE menu_items (
    id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, preparing, ready, on_the_way, delivered
    transaction_id VARCHAR(100),
    receipt_screenshot VARCHAR(255),
    driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    delivery_address TEXT,
    customer_phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order Items Table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

-- Mock Data Insertion

-- 1. Insert Mock Restaurants (Ethiopian theme)
INSERT INTO restaurants (name, description, image_url, rating) VALUES 
('Habesha Gourmet', 'Authentic Ethiopian dining experience with the best Doro Wat.', '/restaurant-1.jpg', 4.8),
('Addis Spice Hub', 'Spicy Kitfo and delicious Tibs served hot and fresh.', '/restaurant-2.jpg', 4.6),
('Sheger Vegan', 'The finest Shiro, Misir, and Gomen for a healthy vegan feast.', '/restaurant-3.jpg', 4.9);

-- 2. Insert Mock Menu Items
INSERT INTO menu_items (restaurant_id, name, description, price, image_url) VALUES 
(1, 'Doro Wat', 'Spicy chicken stew with hard-boiled eggs, served on Injera.', 15.99, '/menu-doro.jpg'),
(1, 'Beg Tibs', 'Sizzling lamb cubes with onions and jalapeños.', 14.50, '/menu-tibs.jpg'),
(2, 'Kitfo', 'Minced lean beef marinated in mitmita and clarified butter.', 16.99, '/menu-kitfo.jpg'),
(2, 'Awaze Tibs', 'Beef tibs coated in spicy awaze sauce.', 13.99, '/menu-awaze.jpg'),
(3, 'Shiro Tegabino', 'Thick chickpea stew served bubbling hot in a clay pot.', 10.99, '/menu-shiro.jpg'),
(3, 'Beyaynetu (Veggie Combo)', 'A colorful platter of lentils, split peas, cabbage, and collard greens.', 12.99, '/menu-beyaynetu.jpg');
