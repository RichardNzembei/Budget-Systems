const express = require('express');
const webPush = require('web-push');
const db = require('../db');
const router = express.Router();
require('dotenv').config();

// Configure web-push
webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:richardsonreuben78@gmail.com',
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

// Generate unique order ID
const generateOrderId = () => {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
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
        notes,
        priority
    } = req.body;

    // Validation
    if (!customerName || !customerPhone || !productType || !productSubtype ||
        !quantity || !totalAmount || !deliveryLocation) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ error: 'Invalid quantity' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Check stock availability
        const [stockRows] = await connection.query(
            'SELECT quantity FROM stock WHERE productType = ? AND productSubtype = ?',
            [productType, productSubtype]
        );

        if (stockRows.length === 0 || stockRows[0].quantity < quantity) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Insufficient stock',
                available: stockRows[0]?.quantity || 0,
                requested: quantity
            });
        }

        // Deduct stock
        await connection.query(
            'UPDATE stock SET quantity = quantity - ? WHERE productType = ? AND productSubtype = ?',
            [quantity, productType, productSubtype]
        );

        // Generate order ID
        const orderId = req.body.orderId || generateOrderId();

        // Insert order
        const [result] = await connection.query(
            `INSERT INTO orders (
                orderId, customerName, customerPhone, productType, productSubtype,
                quantity, totalAmount, amountPaid, paymentStatus,
                deliveryLocation, deliveryStatus, notes, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderId,
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
                notes || '',
                priority || 'normal'
            ]
        );

        await connection.commit();

        // Get created order
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);
        const orderResponse = orders[0];

        // Emit socket event
        console.log('Emitting order-created:', orderResponse);
        req.io.emit('order-created', orderResponse);

        // Emit stock update
        const [updatedStock] = await db.query(
            'SELECT quantity FROM stock WHERE productType = ? AND productSubtype = ?',
            [productType, productSubtype]
        );
        req.io.emit('stock-updated', {
            productType,
            productSubtype,
            newStock: updatedStock[0].quantity
        });

        // Send notification
        const notificationPayload = {
            title: 'New Order Created',
            body: `Order ${orderId} - ${quantity} units of ${productSubtype}`,
            icon: '/icon.png',
            actions: [{ action: 'view', title: 'View Order' }],
        };
        await sendNotification(notificationPayload);

        res.status(201).json(orderResponse);
    } catch (error) {
        await connection.rollback();
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Server error creating order' });
    } finally {
        connection.release();
    }
});

// Get all orders
router.get('/orders', async (req, res) => {
    try {
        const [orders] = await db.query(
            'SELECT * FROM orders ORDER BY createdAt DESC'
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
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        let updateQuery = 'UPDATE orders SET deliveryStatus = ?';
        let params = [deliveryStatus];

        if (deliveryStatus === 'delivered') {
            updateQuery += ', deliveredAt = NOW(), deliveredBy = ?';
            params.push(deliveredBy || 'Worker');
        }

        updateQuery += ' WHERE id = ?';
        params.push(orderId);

        await db.query(updateQuery, params);

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        const notificationPayload = {
            title: 'Order Status Updated',
            body: `Order ${orderResponse.orderId} marked as ${deliveryStatus}`,
            icon: '/icon.png',
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
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        let updateFields = [];
        let params = [];

        if (paymentStatus) {
            updateFields.push('paymentStatus = ?');
            params.push(paymentStatus);
        }
        if (amountPaid !== undefined) {
            updateFields.push('amountPaid = ?');
            params.push(parseFloat(amountPaid));
        }

        params.push(orderId);

        await db.query(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

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

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Get order details before deleting
        const [orders] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        // Restore stock if order wasn't delivered
        if (order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'returned') {
            await connection.query(
                'UPDATE stock SET quantity = quantity + ? WHERE productType = ? AND productSubtype = ?',
                [order.quantity, order.productType, order.productSubtype]
            );
        }

        // Delete order
        await connection.query('DELETE FROM orders WHERE id = ?', [orderId]);

        await connection.commit();

        req.io.emit('order-deleted', { id: parseInt(orderId) });

        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Error deleting order' });
    } finally {
        connection.release();
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
            'UPDATE orders SET workerNotes = ?, workerName = ?, notesAddedAt = NOW() WHERE id = ?',
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

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderData = existing[0];

        if (quantity > orderData.quantity) {
            await connection.rollback();
            return res.status(400).json({ error: 'Return quantity exceeds order quantity' });
        }

        // Restore stock
        await connection.query(
            'UPDATE stock SET quantity = quantity + ? WHERE productType = ? AND productSubtype = ?',
            [parseInt(quantity), orderData.productType, orderData.productSubtype]
        );

        // Update order
        let updateQuery = 'UPDATE orders SET deliveryStatus = ?, returnedQuantity = ?, returnType = ?, returnedAt = NOW()';
        let params = ['returned', quantity, returnType];

        if (returnType === 'partial') {
            updateQuery += ', quantity = ?';
            params.push(orderData.quantity - parseInt(quantity));
        }

        updateQuery += ' WHERE id = ?';
        params.push(orderId);

        await connection.query(updateQuery, params);

        await connection.commit();

        // Get updated order and stock
        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        const [stockRows] = await db.query(
            'SELECT quantity FROM stock WHERE productType = ? AND productSubtype = ?',
            [orderData.productType, orderData.productSubtype]
        );

        req.io.emit('order-updated', orderResponse);

        const stockPayload = {
            productType: orderData.productType,
            productSubtype: orderData.productSubtype,
            newStock: stockRows[0].quantity
        };
        req.io.emit('stock-updated', stockPayload);

        res.status(200).json(orderResponse);
    } catch (error) {
        await connection.rollback();
        console.error('Error returning order:', error);
        res.status(500).json({ error: 'Error returning order' });
    } finally {
        connection.release();
    }
});

// Cancel order
router.patch('/orders/:id/cancel', async (req, res) => {
    const orderId = req.params.id;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [existing] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = existing[0];

        // Restore stock if not yet delivered
        if (order.deliveryStatus !== 'delivered') {
            await connection.query(
                'UPDATE stock SET quantity = quantity + ? WHERE productType = ? AND productSubtype = ?',
                [order.quantity, order.productType, order.productSubtype]
            );
        }

        await connection.query(
            'UPDATE orders SET deliveryStatus = ?, cancelledAt = NOW() WHERE id = ?',
            ['cancelled', orderId]
        );

        await connection.commit();

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        await connection.rollback();
        console.error('Error cancelling order:', error);
        res.status(500).json({ error: 'Error cancelling order' });
    } finally {
        connection.release();
    }
});

module.exports = router;