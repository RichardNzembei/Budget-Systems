import { defineStore } from "pinia";
import axios from "axios";
import { io } from "socket.io-client";
import debounce from "lodash/debounce";

const apiBaseUrl =
  process.env.NODE_ENV === "production"
    ? "http://165.22.220.142:5000"
    : "http://localhost:5000";

export const useOrderStore = defineStore("orders", {
  state: () => ({
    orders: [],
    socket: null,
    loading: false,
    lastFetched: null,
    isConnected: false,
  }),

  getters: {
    pendingOrders: (state) => state.orders.filter(order => order.deliveryStatus !== 'delivered'),
    deliveredOrders: (state) => state.orders.filter(order => order.deliveryStatus === 'delivered'),
    unpaidOrders: (state) => state.orders.filter(order => order.paymentStatus === 'unpaid'),
    partiallyPaidOrders: (state) => state.orders.filter(order => order.paymentStatus === 'partially_paid'),
  },

  actions: {
    initSocket() {
      if (!this.socket) {
        this.socket = io(apiBaseUrl, {
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        this.socket.on("order-created", (payload) => {
          console.log("Order created event received:", payload);
          this.addOrderToState(payload);
        });

        this.socket.on("order-updated", (payload) => {
          console.log("Order updated event received:", payload);
          this.updateOrderInState(payload);
        });

        this.socket.on("order-deleted", ({ id }) => {
          console.log("Order deleted event received:", id);
          this.orders = this.orders.filter((order) => order.id !== id);
          this.cacheOrdersData(this.orders);
        });

        this.socket.on("connect", () => {
          console.log("Connected to WebSocket server");
          this.isConnected = true;
        });

        this.socket.on("disconnect", () => {
          console.log("Disconnected from WebSocket server");
          this.isConnected = false;
        });

        this.socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err.message);
        });
      }
    },

    disconnectSocket() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
      }
    },

    addOrderToState(order) {
      const existingIndex = this.orders.findIndex((o) => o.id === order.id);
      if (existingIndex === -1) {
        this.orders.unshift(order);
        this.cacheOrdersData(this.orders);
      }
    },

    updateOrderInState(order) {
      const index = this.orders.findIndex((o) => o.id === order.id);
      if (index >= 0) {
        this.orders[index] = order;
      } else {
        this.orders.unshift(order);
      }
      this.cacheOrdersData(this.orders);
    },

    fetchOrders: debounce(async function () {
      const cacheValidDuration = 30 * 1000;
      if (this.lastFetched && Date.now() - this.lastFetched < cacheValidDuration) {
        console.log("Using recent orders data, skipping fetch");
        return;
      }

      try {
        this.loading = true;
        const response = await axios.get(`${apiBaseUrl}/api/orders`);
        this.orders = response.data;
        this.lastFetched = Date.now();
        console.log("Fetched orders:", this.orders);
        await this.cacheOrdersData(this.orders);
      } catch (error) {
        console.error("Error fetching orders:", error.response?.data || error.message);
      } finally {
        this.loading = false;
      }
    }, 500),

    async createOrder(orderData) {
      try {
        this.loading = true;
        const response = await axios.post(`${apiBaseUrl}/api/orders`, orderData);
        if (response.status === 201) {
          console.log("Order created successfully:", response.data);
          return response.data;
        }
      } catch (error) {
        console.error("Error creating order:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateOrderDeliveryStatus(orderId, deliveryStatus, deliveredBy) {
      try {
        this.loading = true;
        const response = await axios.patch(`${apiBaseUrl}/api/orders/${orderId}/delivery`, {
          deliveryStatus,
          deliveredBy,
          deliveredAt: new Date().toISOString()
        });
        if (response.status === 200) {
          console.log("Order delivery status updated:", response.data);
          return response.data;
        }
      } catch (error) {
        console.error("Error updating delivery status:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateOrderPaymentStatus(orderId, paymentStatus, amountPaid) {
      try {
        this.loading = true;
        const response = await axios.patch(`${apiBaseUrl}/api/orders/${orderId}/payment`, {
          paymentStatus,
          amountPaid
        });
        if (response.status === 200) {
          console.log("Order payment status updated:", response.data);
          return response.data;
        }
      } catch (error) {
        console.error("Error updating payment status:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async deleteOrder(orderId) {
      try {
        this.loading = true;
        const response = await axios.delete(`${apiBaseUrl}/api/orders/${orderId}`);
        if (response.status === 200) {
          console.log("Order deleted successfully");
          return response.data;
        }
      } catch (error) {
        console.error("Error deleting order:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async updateOrderPriority(orderId, priority) {
      try {
        this.loading = true;
        const response = await axios.patch(`${apiBaseUrl}/api/orders/${orderId}/priority`, {
          priority
        });
        if (response.status === 200) {
          console.log("Order priority updated:", response.data);
          return response.data;
        }
      } catch (error) {
        console.error("Error updating priority:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async addWorkerNotes(orderId, workerNotes, workerName) {
      try {
        this.loading = true;
        const response = await axios.patch(`${apiBaseUrl}/api/orders/${orderId}/worker-notes`, {
          workerNotes,
          workerName
        });
        if (response.status === 200) {
          console.log("Worker notes added:", response.data);
          return response.data;
        }
      } catch (error) {
        console.error("Error adding worker notes:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async returnOrder(orderId, quantity, returnType) {
      try {
        this.loading = true;
        const response = await axios.patch(`${apiBaseUrl}/api/orders/${orderId}/return`, {
          quantity,
          returnType
        });
        if (response.status === 200) {
          console.log("Order returned:", response.data);
          return response.data;
        }
      } catch (error) {
        console.error("Error returning order:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async cancelOrder(orderId) {
      try {
        this.loading = true;
        const response = await axios.patch(`${apiBaseUrl}/api/orders/${orderId}/cancel`);
        if (response.status === 200) {
          console.log("Order cancelled:", response.data);
          return response.data;
        }
      } catch (error) {
        console.error("Error cancelling order:", error.response?.data || error.message);
        throw error;
      } finally {
        this.loading = false;
      }
    },

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

    async syncOrdersData() {
      try {
        const cache = await caches.open("orders-cache");
        const cachedResponse = await cache.match("/api/orders");
        if (cachedResponse) {
          const cachedOrders = await cachedResponse.json();
          console.log("Using cached orders data:", cachedOrders);
          this.orders = cachedOrders;
          this.lastFetched = Date.now();
        } else {
          console.log("No cached orders data available");
          await this.fetchOrders();
        }
      } catch (error) {
        console.error("Error syncing orders data:", error);
      }
    },
  },

  persist: true,
});
