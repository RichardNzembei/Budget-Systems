const express = require('express');
const webPush = require('web-push');
const db = require('../db');
const router = express.Router();
require('dotenv').config();

// Configure web-push
webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:richardsonreuben78@gmail.com',  // fallback
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

// Send push notification helper
const sendNotification = async (notificationPayload) => {
    try {
        const [subscriptions] = await db.query('SELECT * FROM subscriptions');

        await Promise.all(
            subscriptions.map((sub) => {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    expirationTime: sub.expiration_time,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                };
                return webPush.sendNotification(pushSubscription, JSON.stringify(notificationPayload));
            })
        );
        console.log('Notifications sent successfully');
    } catch (error) {
        console.error('Error sending notifications:', error);
    }
};

// Create new order
router.post('/orders', async (req, res) => {
    const {
        customerName,
        customerPhone,
        productType,
        productSubtype,
        quantity,
        totalAmount,
        amountPaid,
        paymentStatus,
        deliveryLocation,
        deliveryStatus,
        notes
    } = req.body;

    // Validation
    if (!customerName || !customerPhone || !productType || !productSubtype ||
        !quantity || !totalAmount || !deliveryLocation) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
    }

    try {
        // Insert order
        const [result] = await db.query(
            `INSERT INTO orders (
                customer_name, customer_phone, product_type, product_subtype,
                quantity, total_amount, amount_paid, payment_status,
                delivery_location, delivery_status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customerName,
                customerPhone,
                productType,
                productSubtype,
                quantity,
                parseFloat(totalAmount),
                parseFloat(amountPaid || 0),
                paymentStatus || 'unpaid',
                deliveryLocation,
                deliveryStatus || 'pending',
                notes || ''
            ]
        );

        // Get created order
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);
        const orderResponse = orders[0];

        // Emit socket event
        console.log('Emitting order-created:', orderResponse);
        req.io.emit('order-created', orderResponse);

        // Send notification
        const notificationPayload = {
            title: 'New Order Created',
            body: `Order for ${customerName} - ${quantity} units of ${productSubtype}`,
            icon: '/icon.png',
            actions: [{ action: 'view', title: 'View Order' }],
        };
        await sendNotification(notificationPayload);

        res.status(201).json(orderResponse);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Server error creating order' });
    }
});

// Get all orders
router.get('/orders', async (req, res) => {
    try {
        const [orders] = await db.query(
            'SELECT * FROM orders ORDER BY created_at DESC'
        );

        console.log('Fetched orders:', orders.length);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Server error fetching orders' });
    }
});

// Update order delivery status
router.patch('/orders/:id/delivery', async (req, res) => {
    const orderId = req.params.id;
    const { deliveryStatus, deliveredBy } = req.body;

    if (!deliveryStatus) {
        return res.status(400).json({ error: 'Delivery status is required' });
    }

    try {
        // Check if order exists
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Build update query
        let updateQuery = 'UPDATE orders SET delivery_status = ?';
        let params = [deliveryStatus];

        if (deliveryStatus === 'delivered') {
            updateQuery += ', delivered_at = NOW(), delivered_by = ?';
            params.push(deliveredBy || 'Worker');
        }

        updateQuery += ' WHERE id = ?';
        params.push(orderId);

        await db.query(updateQuery, params);

        // Get updated order
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        // Emit socket event
        console.log('Emitting order-updated:', orderResponse);
        req.io.emit('order-updated', orderResponse);

        // Send notification
        const notificationPayload = {
            title: 'Order Status Updated',
            body: `Order for ${orderResponse.customer_name} marked as ${deliveryStatus}`,
            icon: '/icon.png',
            actions: [{ action: 'view', title: 'View Order' }],
        };
        await sendNotification(notificationPayload);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ error: 'Error updating delivery status' });
    }
});

// Update order payment status
router.patch('/orders/:id/payment', async (req, res) => {
    const orderId = req.params.id;
    const { paymentStatus, amountPaid } = req.body;

    if (!paymentStatus && amountPaid === undefined) {
        return res.status(400).json({ error: 'Payment status or amount paid is required' });
    }

    try {
        // Check if order exists
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Build update query
        let updateFields = [];
        let params = [];

        if (paymentStatus) {
            updateFields.push('payment_status = ?');
            params.push(paymentStatus);
        }
        if (amountPaid !== undefined) {
            updateFields.push('amount_paid = ?');
            params.push(parseFloat(amountPaid));
        }

        params.push(orderId);

        await db.query(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        // Get updated order
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        // Emit socket event
        console.log('Emitting order-updated:', orderResponse);
        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Error updating payment status' });
    }
});

// Delete order
router.delete('/orders/:id', async (req, res) => {
    const orderId = req.params.id;

    try {
        const [result] = await db.query('DELETE FROM orders WHERE id = ?', [orderId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Emit socket event
        req.io.emit('order-deleted', { id: parseInt(orderId) });

        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Error deleting order' });
    }
});

// Update order priority
router.patch('/orders/:id/priority', async (req, res) => {
    const orderId = req.params.id;
    const { priority } = req.body;

    if (!priority || !['normal', 'high'].includes(priority)) {
        return res.status(400).json({ error: 'Valid priority (normal or high) is required' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await db.query('UPDATE orders SET priority = ? WHERE id = ?', [priority, orderId]);

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({ error: 'Error updating priority' });
    }
});

// Add worker notes
router.patch('/orders/:id/worker-notes', async (req, res) => {
    const orderId = req.params.id;
    const { workerNotes, workerName } = req.body;

    if (!workerNotes) {
        return res.status(400).json({ error: 'Worker notes are required' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await db.query(
            'UPDATE orders SET worker_notes = ?, worker_name = ?, notes_added_at = NOW() WHERE id = ?',
            [workerNotes, workerName || 'Worker', orderId]
        );

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error adding worker notes:', error);
        res.status(500).json({ error: 'Error adding worker notes' });
    }
});

// Return order
router.patch('/orders/:id/return', async (req, res) => {
    const orderId = req.params.id;
    const { quantity, returnType } = req.body;

    if (!quantity || !returnType) {
        return res.status(400).json({ error: 'Quantity and return type are required' });
    }

    try {
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderData = existing[0];

        if (quantity > orderData.quantity) {
            return res.status(400).json({ error: 'Return quantity exceeds order quantity' });
        }

        // Restore stock
        await db.query(
            `INSERT INTO stock (product_type, product_subtype, quantity)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
            [orderData.product_type, orderData.product_subtype, parseInt(quantity)]
        );

        // Get updated stock quantity
        const [stockRows] = await db.query(
            'SELECT quantity FROM stock WHERE product_type = ? AND product_subtype = ?',
            [orderData.product_type, orderData.product_subtype]
        );

        // Update order
        let updateQuery = 'UPDATE orders SET delivery_status = ?, returned_quantity = ?, return_type = ?, returned_at = NOW()';
        let params = ['returned', quantity, returnType];

        if (returnType === 'partial') {
            updateQuery += ', quantity = ?';
            params.push(orderData.quantity - parseInt(quantity));
        }

        updateQuery += ' WHERE id = ?';
        params.push(orderId);

        await db.query(updateQuery, params);

        // Get updated order
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        // Emit stock update
        const stockPayload = {
            productType: orderData.product_type,
            productSubtype: orderData.product_subtype,
            newStock: stockRows[0].quantity
        };
        req.io.emit('stock-updated', stockPayload);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error returning order:', error);
        res.status(500).json({ error: 'Error returning order' });
    }
});

// Cancel order
router.patch('/orders/:id/cancel', async (req, res) => {
    const orderId = req.params.id;

    try {
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await db.query(
            'UPDATE orders SET delivery_status = ?, cancelled_at = NOW() WHERE id = ?',
            ['cancelled', orderId]
        );

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Error cancelling order' });
    }
});

module.exports = router;