import { defineStore } from "pinia";
import axios from "axios";
import { io } from "socket.io-client";
import debounce from "lodash/debounce";

const apiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://165.22.220.142:5000"
    : "http://localhost:5000";

export const useOrderStore = defineStore("orders", {
  state: () => ({
    orders: [],
    socket: null,
    loading: false,
    lastFetched: null,
    isConnected: false,
    error: null,
  }),

  getters: {
    pendingOrders: (state) =>
      state.orders.filter(order => order.deliveryStatus !== 'delivered'),
    deliveredOrders: (state) =>
      state.orders.filter(order => order.deliveryStatus === 'delivered'),
    unpaidOrders: (state) =>
      state.orders.filter(order => order.paymentStatus === 'unpaid'),
    partiallyPaidOrders: (state) =>
      state.orders.filter(order => order.paymentStatus === 'partially_paid'),
    paidOrders: (state) =>
      state.orders.filter(order => order.paymentStatus === 'paid'),
    urgentOrders: (state) =>
      state.orders.filter(order => order.priority === 'urgent' || order.priority === 'high'),
  },

  actions: {
    /**
     * Initialize WebSocket connection with proper event handlers
     */
    initSocket() {
      if (!this.socket) {
        this.socket = io(apiBaseUrl, {
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        // Order created event
        this.socket.on("order-created", (payload) => {
          try {
            console.log("Order created event received:", payload);
            if (this.validateOrderPayload(payload)) {
              this.addOrderToState(payload);
            } else {
              console.warn("Invalid order-created payload:", payload);
            }
          } catch (error) {
            console.error("Error handling order-created event:", error);
          }
        });

        // Order updated event
        this.socket.on("order-updated", (payload) => {
          try {
            console.log("Order updated event received:", payload);
            if (this.validateOrderPayload(payload)) {
              this.updateOrderInState(payload);
            } else {
              console.warn("Invalid order-updated payload:", payload);
            }
          } catch (error) {
            console.error("Error handling order-updated event:", error);
          }
        });

        // Order deleted event
        this.socket.on("order-deleted", (payload) => {
          try {
            console.log("Order deleted event received:", payload);
            if (payload && typeof payload.id === 'number') {
              this.orders = this.orders.filter((order) => order.id !== payload.id);
              this.cacheOrdersData(this.orders);
            } else {
              console.warn("Invalid order-deleted payload:", payload);
            }
          } catch (error) {
            console.error("Error handling order-deleted event:", error);
          }
        });

        // Connection events
        this.socket.on("connect", () => {
          console.log("Connected to WebSocket server");
          this.isConnected = true;
          this.error = null;
        });

        this.socket.on("disconnect", () => {
          console.log("Disconnected from WebSocket server");
          this.isConnected = false;
        });

        this.socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err.message);
          this.isConnected = false;
          this.error = `Connection error: ${err.message}`;
        });

        this.socket.on("reconnect", (attemptNumber) => {
          console.log(`Reconnected after ${attemptNumber} attempts`);
          this.isConnected = true;
          this.error = null;
          // Refresh orders after reconnection
          this.fetchOrders();
        });
      }
    },

    /**
     * Validate order payload structure
     */
    validateOrderPayload(payload) {
      if (!payload || typeof payload !== 'object') {
        return false;
      }

      // Check required fields
      const requiredFields = ['id', 'customerName', 'productType', 'productSubtype'];
      return requiredFields.every(field => payload[field] !== undefined && payload[field] !== null);
    },

    /**
     * Normalize order data from backend (snake_case to camelCase)
     */
    normalizeOrder(order) {
      return {
        ...order,
        // Standardize field names
        productType: order.productType || order.product_type,
        productSubtype: order.productSubtype || order.product_subtype,
        paymentStatus: order.paymentStatus || order.payment_status || 'unpaid',
        deliveryStatus: order.deliveryStatus || order.delivery_status || 'pending',
        deliveredBy: order.deliveredBy || order.delivered_by,
        deliveredAt: order.deliveredAt || order.delivered_at,
        returnedQuantity: order.returnedQuantity || order.returned_quantity,
        returnType: order.returnType || order.return_type,
        returnedAt: order.returnedAt || order.returned_at,
        cancelledAt: order.cancelledAt || order.cancelled_at,
        workerNotes: order.workerNotes || order.worker_notes,
        workerName: order.workerName || order.worker_name,
        workerNotesUpdatedAt: order.workerNotesUpdatedAt || order.worker_notes_updated_at,
        createdAt: order.createdAt || order.created_at,
        updatedAt: order.updatedAt || order.updated_at,
      };
    },

    /**
     * Disconnect WebSocket
     */
    disconnectSocket() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
      }
    },

    /**
     * Add new order to state
     */
    addOrderToState(order) {
      const existingIndex = this.orders.findIndex((o) => o.id === order.id);
      if (existingIndex === -1) {
        const normalizedOrder = this.normalizeOrder(order);
        this.orders.unshift(normalizedOrder);
        this.cacheOrdersData(this.orders);
      }
    },

    /**
     * Update existing order in state
     */
    updateOrderInState(order) {
      const index = this.orders.findIndex((o) => o.id === order.id);
      const normalizedOrder = this.normalizeOrder(order);

      if (index >= 0) {
        this.orders[index] = normalizedOrder;
      } else {
        // If order doesn't exist, add it
        this.orders.unshift(normalizedOrder);
      }
      this.cacheOrdersData(this.orders);
    },

    /**
     * Fetch all orders from API (debounced)
     */
    fetchOrders: debounce(async function () {
      const cacheValidDuration = 30 * 1000; // 30 seconds
      if (this.lastFetched && Date.now() - this.lastFetched < cacheValidDuration) {
        console.log("Using recent orders data, skipping fetch");
        return;
      }

      try {
        this.loading = true;
        this.error = null;

        const response = await axios.get(`${apiBaseUrl}/api/orders`);

        // Normalize all orders
        this.orders = response.data.map(order => this.normalizeOrder(order));
        this.lastFetched = Date.now();

        console.log("Fetched orders:", this.orders.length);
        await this.cacheOrdersData(this.orders);
      } catch (error) {
        console.error("Error fetching orders:", error.response?.data || error.message);
        this.error = `Failed to fetch orders: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    }, 500),

    /**
     * Create new order
     */
    async createOrder(orderData) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.post(`${apiBaseUrl}/api/orders`, orderData);

        if (response.status === 201) {
          console.log("Order created successfully:", response.data);
          return this.normalizeOrder(response.data);
        }
      } catch (error) {
        console.error("Error creating order:", error.response?.data || error.message);
        this.error = `Failed to create order: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update order delivery status
     */
    async updateOrderDeliveryStatus(orderId, deliveryStatus, deliveredBy) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.patch(
          `${apiBaseUrl}/api/orders/${orderId}/delivery`,
          {
            deliveryStatus,
            deliveredBy,
          }
        );

        if (response.status === 200) {
          console.log("Order delivery status updated:", response.data);
          return this.normalizeOrder(response.data);
        }
      } catch (error) {
        console.error("Error updating delivery status:", error.response?.data || error.message);
        this.error = `Failed to update delivery status: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update order payment status
     */
    async updateOrderPaymentStatus(orderId, paymentStatus, amountPaid) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.patch(
          `${apiBaseUrl}/api/orders/${orderId}/payment`,
          {
            paymentStatus,
            amountPaid,
          }
        );

        if (response.status === 200) {
          console.log("Order payment status updated:", response.data);
          return this.normalizeOrder(response.data);
        }
      } catch (error) {
        console.error("Error updating payment status:", error.response?.data || error.message);
        this.error = `Failed to update payment status: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Delete order
     */
    async deleteOrder(orderId) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.delete(`${apiBaseUrl}/api/orders/${orderId}`);

        if (response.status === 200) {
          console.log("Order deleted successfully");
          return response.data;
        }
      } catch (error) {
        console.error("Error deleting order:", error.response?.data || error.message);
        this.error = `Failed to delete order: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Update order priority
     */
    async updateOrderPriority(orderId, priority) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.patch(
          `${apiBaseUrl}/api/orders/${orderId}/priority`,
          { priority }
        );

        if (response.status === 200) {
          console.log("Order priority updated:", response.data);
          return this.normalizeOrder(response.data);
        }
      } catch (error) {
        console.error("Error updating priority:", error.response?.data || error.message);
        this.error = `Failed to update priority: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Add worker notes to order
     */
    async addWorkerNotes(orderId, workerNotes, workerName) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.patch(
          `${apiBaseUrl}/api/orders/${orderId}/worker-notes`,
          {
            workerNotes,
            workerName,
          }
        );

        if (response.status === 200) {
          console.log("Worker notes added:", response.data);
          return this.normalizeOrder(response.data);
        }
      } catch (error) {
        console.error("Error adding worker notes:", error.response?.data || error.message);
        this.error = `Failed to add worker notes: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Return order (full or partial)
     */
    async returnOrder(orderId, quantity, returnType) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.patch(
          `${apiBaseUrl}/api/orders/${orderId}/return`,
          {
            quantity,
            returnType,
          }
        );

        if (response.status === 200) {
          console.log("Order returned:", response.data);
          return this.normalizeOrder(response.data);
        }
      } catch (error) {
        console.error("Error returning order:", error.response?.data || error.message);
        this.error = `Failed to return order: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Cancel order
     */
    async cancelOrder(orderId) {
      try {
        this.loading = true;
        this.error = null;

        const response = await axios.patch(`${apiBaseUrl}/api/orders/${orderId}/cancel`);

        if (response.status === 200) {
          console.log("Order cancelled:", response.data);
          return this.normalizeOrder(response.data);
        }
      } catch (error) {
        console.error("Error cancelling order:", error.response?.data || error.message);
        this.error = `Failed to cancel order: ${error.response?.data?.error || error.message}`;
        throw error;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Cache orders data in browser cache
     */
    async cacheOrdersData(ordersData) {
      try {
        const cache = await caches.open("orders-cache");
        const cachedResponse = new Response(JSON.stringify(ordersData));
        await cache.put("/api/orders", cachedResponse);
        console.log("Orders data cached successfully");
      } catch (error) {
        console.error("Error caching orders data:", error);
      }
    },

    /**
     * Sync orders from cache or fetch from API
     */
    async syncOrdersData() {
      try {
        const cache = await caches.open("orders-cache");
        const cachedResponse = await cache.match("/api/orders");

        if (cachedResponse) {
          const cachedOrders = await cachedResponse.json();
          console.log("Using cached orders data:", cachedOrders.length);
          this.orders = cachedOrders.map(order => this.normalizeOrder(order));
          this.lastFetched = Date.now();
        } else {
          console.log("No cached orders data available, fetching from API");
          await this.fetchOrders();
        }
      } catch (error) {
        console.error("Error syncing orders data:", error);
        // Fallback to fetching from API
        await this.fetchOrders();
      }
    },

    /**
     * Clear all cached data
     */
    async clearCache() {
      try {
        const cache = await caches.open("orders-cache");
        await cache.delete("/api/orders");
        console.log("Orders cache cleared");
      } catch (error) {
        console.error("Error clearing cache:", error);
      }
    },

    /**
     * Reset store to initial state
     */
    resetStore() {
      this.orders = [];
      this.loading = false;
      this.lastFetched = null;
      this.error = null;
      this.disconnectSocket();
    },
  },

  persist: true,
});
