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
        console.log('✅ Notifications sent');
    } catch (error) {
        console.error('❌ Notification error:', error);
    }
};

// Generate unique order ID
const generateOrderId = () => {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
};

// Helper function to emit stock update event
const emitStockUpdate = async (io, productType, productSubtype) => {
    try {
        const [updatedStock] = await db.query(
            'SELECT quantity FROM stock WHERE productType = ? AND productSubtype = ?',
            [productType, productSubtype]
        );
        if (updatedStock.length > 0) {
            io.emit('stock-updated', {
                productType,
                productSubtype,
                newStock: updatedStock[0].quantity
            });
        }
    } catch (error) {
        console.error('Error emitting stock update:', error);
    }
};

// Create new order
router.post('/', async (req, res) => {
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
        console.log('📦 Order created:', orderResponse.orderId);
        req.io.emit('order-created', orderResponse);

        // Emit stock update
        await emitStockUpdate(req.io, productType, productSubtype);

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
router.get('/', async (req, res) => {
    try {
        const [orders] = await db.query(
            'SELECT * FROM orders ORDER BY createdAt DESC'
        );
        console.log(`📊 Fetched ${orders.length} orders`);
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Server error fetching orders' });
    }
});

// Delete order (replaces cancel)
router.delete('/:id', async (req, res) => {
    const orderId = req.params.id;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [orders] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        // Restore stock if order was not delivered
        if (order.deliveryStatus !== 'delivered' && order.deliveryStatus !== 'returned') {
            // For returned orders, only restore what wasn't already restored
            const quantityToRestore = order.deliveryStatus === 'returned'
                ? order.quantity - (order.returnedQuantity || 0)
                : order.quantity;

            if (quantityToRestore > 0) {
                await connection.query(
                    'UPDATE stock SET quantity = quantity + ? WHERE productType = ? AND productSubtype = ?',
                    [quantityToRestore, order.productType, order.productSubtype]
                );
            }
        }

        await connection.query('DELETE FROM orders WHERE id = ?', [orderId]);

        await connection.commit();

        // Emit order deleted event
        req.io.emit('order-deleted', { id: parseInt(orderId) });

        // Emit stock update if stock was restored
        if (order.deliveryStatus !== 'delivered') {
            await emitStockUpdate(req.io, order.productType, order.productSubtype);
        }

        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting order:', error);
        res.status(500).json({ error: 'Error deleting order' });
    } finally {
        connection.release();
    }
});

// Update delivery status
router.patch('/:id/delivery', async (req, res) => {
    const orderId = req.params.id;
    const { deliveryStatus, deliveredBy } = req.body;

    if (!deliveryStatus) {
        return res.status(400).json({ error: 'Delivery status is required' });
    }

    const validStatuses = ['pending', 'in_transit', 'delivered', 'returned'];
    if (!validStatuses.includes(deliveryStatus)) {
        return res.status(400).json({
            error: 'Invalid delivery status',
            validStatuses
        });
    }

    try {
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        let updateQuery = 'UPDATE orders SET deliveryStatus = ?';
        let params = [deliveryStatus];

        // Add delivered timestamp and person if status is delivered
        if (deliveryStatus === 'delivered') {
            updateQuery += ', deliveredAt = NOW()';
            if (deliveredBy) {
                updateQuery += ', deliveredBy = ?';
                params.push(deliveredBy);
            }
        }

        updateQuery += ' WHERE id = ?';
        params.push(orderId);

        await db.query(updateQuery, params);

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ error: 'Error updating delivery status' });
    }
});

// Update payment status
router.patch('/:id/payment', async (req, res) => {
    const orderId = req.params.id;
    const { paymentStatus, amountPaid } = req.body;

    if (!paymentStatus) {
        return res.status(400).json({ error: 'Payment status is required' });
    }

    const validStatuses = ['unpaid', 'partially_paid', 'paid'];
    if (!validStatuses.includes(paymentStatus)) {
        return res.status(400).json({
            error: 'Invalid payment status',
            validStatuses
        });
    }

    try {
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = existing[0];

        let updateQuery = 'UPDATE orders SET paymentStatus = ?';
        let params = [paymentStatus];

        // Update amount paid if provided
        if (amountPaid !== undefined && amountPaid !== null) {
            const newAmountPaid = parseFloat(amountPaid);

            if (newAmountPaid < 0) {
                return res.status(400).json({ error: 'Amount paid cannot be negative' });
            }

            if (newAmountPaid > order.totalAmount) {
                return res.status(400).json({
                    error: 'Amount paid cannot exceed total amount',
                    totalAmount: order.totalAmount,
                    amountPaid: newAmountPaid
                });
            }

            updateQuery += ', amountPaid = ?';
            params.push(newAmountPaid);

            // Auto-update payment status based on amount
            if (newAmountPaid === 0) {
                params[0] = 'unpaid';
            } else if (newAmountPaid >= order.totalAmount) {
                params[0] = 'paid';
            } else {
                params[0] = 'partially_paid';
            }
        }

        updateQuery += ' WHERE id = ?';
        params.push(orderId);

        await db.query(updateQuery, params);

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ error: 'Error updating payment status' });
    }
});

// Update priority
router.patch('/:id/priority', async (req, res) => {
    const orderId = req.params.id;
    const { priority } = req.body;

    if (!priority) {
        return res.status(400).json({ error: 'Priority is required' });
    }

    const validPriorities = ['normal', 'high'];
    if (!validPriorities.includes(priority)) {
        return res.status(400).json({
            error: 'Invalid priority',
            validPriorities
        });
    }

    try {
        const [existing] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        await db.query(
            'UPDATE orders SET priority = ? WHERE id = ?',
            [priority, orderId]
        );

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
router.patch('/:id/worker-notes', async (req, res) => {
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

        let updateQuery = 'UPDATE orders SET workerNotes = ?, workerNotesUpdatedAt = NOW()';
        let params = [workerNotes];

        if (workerName) {
            updateQuery += ', workerName = ?';
            params.push(workerName);
        }

        updateQuery += ' WHERE id = ?';
        params.push(orderId);

        await db.query(updateQuery, params);

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        res.status(200).json(orderResponse);
    } catch (error) {
        console.error('Error adding worker notes:', error);
        res.status(500).json({ error: 'Error adding worker notes' });
    }
});

// Return order - FIXED with proper tracking
router.patch('/:id/return', async (req, res) => {
    const orderId = req.params.id;
    const { quantity, returnType } = req.body;

    if (!quantity || !returnType) {
        return res.status(400).json({ error: 'Quantity and return type are required' });
    }

    const validReturnTypes = ['full', 'partial'];
    if (!validReturnTypes.includes(returnType)) {
        return res.status(400).json({
            error: 'Invalid return type',
            validReturnTypes
        });
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

        // Check if order was delivered
        if (orderData.deliveryStatus !== 'delivered') {
            await connection.rollback();
            return res.status(400).json({
                error: 'Can only return delivered orders',
                currentStatus: orderData.deliveryStatus
            });
        }

        // Validate return quantity
        const alreadyReturned = orderData.returnedQuantity || 0;
        const remainingQuantity = orderData.quantity - alreadyReturned;

        if (quantity > remainingQuantity) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Return quantity exceeds remaining order quantity',
                totalQuantity: orderData.quantity,
                alreadyReturned: alreadyReturned,
                remaining: remainingQuantity,
                requested: quantity
            });
        }

        // Restore stock
        await connection.query(
            'UPDATE stock SET quantity = quantity + ? WHERE productType = ? AND productSubtype = ?',
            [parseInt(quantity), orderData.productType, orderData.productSubtype]
        );

        // Calculate new returned quantity
        const newReturnedQuantity = alreadyReturned + parseInt(quantity);
        const isFullReturn = newReturnedQuantity >= orderData.quantity;

        // Update order
        await connection.query(
            `UPDATE orders 
             SET deliveryStatus = ?, 
                 returnedQuantity = ?, 
                 returnType = ?,
                 returnedAt = NOW()
             WHERE id = ?`,
            [
                isFullReturn ? 'returned' : 'delivered', // Keep as delivered if partial
                newReturnedQuantity,
                isFullReturn ? 'full' : 'partial',
                orderId
            ]
        );

        await connection.commit();

        const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
        const orderResponse = orders[0];

        req.io.emit('order-updated', orderResponse);

        // Emit stock update
        await emitStockUpdate(req.io, orderData.productType, orderData.productSubtype);

        res.status(200).json(orderResponse);
    } catch (error) {
        await connection.rollback();
        console.error('Error returning order:', error);
        res.status(500).json({ error: 'Error returning order' });
    } finally {
        connection.release();
    }
});

module.exports = router;