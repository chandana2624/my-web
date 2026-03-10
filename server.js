const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Export app for Netlify Functions
module.exports = app;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); // Serve static files from current directory

// Supabase Setup (Cloud Persistence)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase Cloud Database initialized.');
} else {
    console.log('Supabase credentials missing. Falling back to local SQLite.');
}

// Database Setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create customers table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating customers table', err.message);
            } else {
                console.log('Customers table ready.');
            }
        });

        // Because we are modifying the schema, we'll try to add columns or just drop/recreate for simplicity in dev.
        // For safe dev environment reset: Drop table and recreate it.
        db.run('DROP TABLE IF EXISTS orders', (err) => {
            db.run(`CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                contact_number TEXT NOT NULL,
                delivery_location TEXT NOT NULL,
                product_name TEXT NOT NULL,
                price TEXT NOT NULL,
                payment_id TEXT,
                status TEXT DEFAULT 'Order Placed',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`, (err) => {
                if (err) {
                    console.error('Error creating orders table', err.message);
                } else {
                    console.log('Orders table ready with location tracking.');
                }
            });
        });
    }
});

// API Endpoints
app.post('/api/customers', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required.' });
    }

    if (supabase) {
        // Use Supabase
        const { data, error } = await supabase
            .from('customers')
            .insert([{ name, email, message }])
            .select();

        if (error) {
            console.error('Supabase Error (customers):', error.message);
            return res.status(500).json({ error: 'Failed to save customer data to cloud.' });
        }
        return res.status(201).json({ message: 'Customer stored in cloud successfully', id: data[0].id });
    }

    const sql = 'INSERT INTO customers (name, email, message) VALUES (?, ?, ?)';
    db.run(sql, [name, email, message], function (err) {
        if (err) {
            console.error('Error inserting customer:', err.message);
            return res.status(500).json({ error: 'Failed to save customer data.' });
        }
        res.status(201).json({
            message: 'Customer stored successfully',
            id: this.lastID
        });
    });
});

app.get('/api/customers', async (req, res) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase Fetch Error (customers):', error.message);
            return res.status(500).json({ error: 'Failed to fetch customer data from cloud.' });
        }
        return res.json(data);
    }

    db.all('SELECT * FROM customers ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching customers:', err.message);
            return res.status(500).json({ error: 'Failed to fetch customer data.' });
        }
        res.json(rows);
    });
});

// Orders Endpoints
app.post('/api/orders', async (req, res) => {
    const { productName, price, customerName, customerEmail, contactNumber, deliveryLocation, paymentId } = req.body;

    if (!productName || !price || !customerName || !customerEmail || !contactNumber || !deliveryLocation) {
        return res.status(400).json({ error: 'All fields including delivery location are required.' });
    }

    if (supabase) {
        const { data, error } = await supabase
            .from('orders')
            .insert([{
                customer_name: customerName,
                customer_email: customerEmail,
                contact_number: contactNumber,
                delivery_location: deliveryLocation,
                product_name: productName,
                price: price,
                payment_id: paymentId,
                status: 'Order Placed'
            }])
            .select();

        if (error) {
            console.error('Supabase Error (orders):', error.message);
            return res.status(500).json({ error: 'Failed to save order to cloud.' });
        }
        return res.status(201).json({
            message: 'Order placed in cloud successfully!',
            orderId: data[0].id,
            orderDetails: {
                id: data[0].id,
                product: productName,
                price: price,
                customerName: customerName,
                paymentId: paymentId,
                status: 'Order Placed',
                estimatedDelivery: '3-5 business days'
            }
        });
    }

    const sql = 'INSERT INTO orders (customer_name, customer_email, contact_number, delivery_location, product_name, price, payment_id) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.run(sql, [customerName, customerEmail, contactNumber, deliveryLocation, productName, price, paymentId], function (err) {
        if (err) {
            console.error('Error inserting order:', err.message);
            return res.status(500).json({ error: 'Failed to save order.' });
        }
        res.status(201).json({
            message: 'Order placed successfully!',
            orderId: this.lastID,
            orderDetails: {
                id: this.lastID,
                product: productName,
                price: price,
                customerName: customerName,
                paymentId: paymentId,
                status: 'Order Placed',
                estimatedDelivery: '3-5 business days'
            }
        });
    });
});

app.get('/api/orders', async (req, res) => {
    // Basic protection: requiring a simple header auth for this route
    const authHeader = req.headers.authorization;
    if (authHeader !== 'Bearer admin-token-123') {
        return res.status(403).json({ error: 'Unauthorized access.' });
    }

    if (supabase) {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase Fetch Error (orders):', error.message);
            return res.status(500).json({ error: 'Failed to fetch orders from cloud.' });
        }
        return res.json(data);
    }

    db.all('SELECT * FROM orders ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching orders:', err.message);
            return res.status(500).json({ error: 'Failed to fetch orders.' });
        }
        res.json(rows);
    });
});

// Admin Authentication endpoint
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    // Hardcoded simple password for owner dashboard
    if (password && password.trim() === 'chandulavv0604') {
        res.json({ success: true, token: 'admin-token-123' });
    } else {
        res.status(401).json({ success: false, error: 'Incorrect password.' });
    }
});

// Start Server (only if running directly)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
