<template>
  <div class="min-h-screen bg-black p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight mb-2 text-white">Create New Order</h1>
      <p class="text-zinc-500">Record customer orders with delivery and payment details</p>
    </div>

    <div class="max-w-3xl mx-auto">
      <div class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-8">
        <form @submit.prevent="createOrder" class="space-y-6">
          <!-- Customer Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium mb-2 text-white">Customer Name</label>
              <input
                v-model="orderData.customerName"
                type="text"
                placeholder="Enter customer name"
                class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2 text-white">Customer Phone</label>
              <input
                v-model="orderData.customerPhone"
                type="tel"
                placeholder="Enter phone number"
                class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                required
              />
            </div>
          </div>

          <!-- Product Selection -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium mb-2 text-white">Product Type</label>
              <div class="relative">
                <select
                  v-model="orderData.productType"
                  class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
                  required
                >
                  <option value="">Select Product Type</option>
                  <option v-for="type in productTypes" :key="type" :value="type">
                    {{ type }}
                  </option>
                </select>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none"
                />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium mb-2 text-white">Product Subtype</label>
              <div class="relative">
                <select
                  v-model="orderData.productSubtype"
                  class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white appearance-none focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer"
                  :disabled="!orderData.productType"
                  required
                >
                  <option value="">Select Product Subtype</option>
                  <option v-for="subtype in productSubtypes" :key="subtype" :value="subtype">
                    {{ subtype }}
                  </option>
                </select>
                <UIcon
                  name="i-heroicons-chevron-down"
                  class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none"
                />
              </div>
            </div>
          </div>

          <!-- Quantity -->
          <div>
            <label class="block text-sm font-medium mb-2 text-white">Quantity</label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                @click="decrementQuantity"
                class="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
              >
                <UIcon name="i-heroicons-minus" class="w-5 h-5 text-white" />
              </button>
              <input
                v-model.number="orderData.quantity"
                type="number"
                min="1"
                class="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-3 text-center text-2xl font-bold text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                required
              />
              <button
                type="button"
                @click="incrementQuantity"
                class="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
              >
                <UIcon name="i-heroicons-plus" class="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <!-- Payment Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium mb-2 text-white">Total Amount</label>
              <input
                v-model.number="orderData.totalAmount"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter total amount"
                class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2 text-white">Amount Paid</label>
              <input
                v-model.number="orderData.amountPaid"
                type="number"
                min="0"
                step="0.01"
                :max="orderData.totalAmount"
                placeholder="Enter amount paid"
                class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                @input="updatePaymentStatus"
              />
            </div>
          </div>

          <!-- Payment Status Badge -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-zinc-500">Payment Status:</span>
            <UBadge
              :color="paymentStatusColor"
              variant="subtle"
            >
              {{ paymentStatusLabel }}
            </UBadge>
          </div>

          <!-- Delivery Location -->
          <div>
            <label class="block text-sm font-medium mb-2 text-white">Delivery Location</label>
            <input
              v-model="orderData.deliveryLocation"
              type="text"
              placeholder="Enter delivery address"
              class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium mb-2 text-white">Notes (Optional)</label>
            <textarea
              v-model="orderData.notes"
              rows="4"
              placeholder="Add any special instructions or notes..."
              class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
            ></textarea>
          </div>

          <!-- Error Message -->
          <div
            v-if="errorMessage"
            class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3"
          >
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-red-400">{{ errorMessage }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg font-semibold text-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-white"
          >
            <UIcon name="i-heroicons-shopping-bag" class="w-6 h-6" />
            {{ loading ? 'Creating Order...' : 'Create Order' }}
          </button>
        </form>
      </div>

      <!-- Recent Orders -->
      <div v-if="recentOrders.length > 0" class="mt-8">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
          <UIcon name="i-heroicons-clock" class="w-5 h-5 text-blue-400" />
          Recent Orders
        </h3>
        <div class="space-y-2">
          <div
            v-for="order in recentOrders.slice(0, 5)"
            :key="order.id"
            class="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <p class="font-medium text-white">{{ order.customerName }}</p>
                <p class="text-sm text-zinc-400">{{ order.productType }} / {{ order.productSubtype }}</p>
                <p class="text-xs text-zinc-500 mt-1">{{ order.deliveryLocation }}</p>
              </div>
              <div class="text-right space-y-1">
                <UBadge
                  :color="order.deliveryStatus === 'delivered' ? 'green' : 'orange'"
                  variant="subtle"
                  size="xs"
                >
                  {{ order.deliveryStatus }}
                </UBadge>
                <UBadge
                  :color="getPaymentColor(order.paymentStatus)"
                  variant="subtle"
                  size="xs"
                >
                  {{ order.paymentStatus }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useOrderStore } from '@/stores/orderStore'
import { useStockStore } from '@/stores/stockStore'

definePageMeta({
  layout:'admin'
})

const orderStore = useOrderStore()
const stockStore = useStockStore()
const toast = useToast()

const orderData = ref({
  customerName: '',
  customerPhone: '',
  productType: '',
  productSubtype: '',
  quantity: 1,
  totalAmount: 0,
  amountPaid: 0,
  paymentStatus: 'unpaid',
  deliveryLocation: '',
  deliveryStatus: 'pending',
  notes: ''
})

const loading = ref(false)
const errorMessage = ref('')

const productTypes = computed(() => Object.keys(stockStore.stock))

const productSubtypes = computed(() => {
  if (!orderData.value.productType) return []
  return Object.keys(stockStore.stock[orderData.value.productType] || {})
})

const recentOrders = computed(() => {
  return orderStore.orders
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const paymentStatusLabel = computed(() => {
  if (orderData.value.amountPaid === 0) return 'Unpaid'
  if (orderData.value.amountPaid >= orderData.value.totalAmount) return 'Paid'
  return 'Partially Paid'
})

const paymentStatusColor = computed(() => {
  if (orderData.value.amountPaid === 0) return 'red'
  if (orderData.value.amountPaid >= orderData.value.totalAmount) return 'green'
  return 'orange'
})

const updatePaymentStatus = () => {
  if (orderData.value.amountPaid === 0) {
    orderData.value.paymentStatus = 'unpaid'
  } else if (orderData.value.amountPaid >= orderData.value.totalAmount) {
    orderData.value.paymentStatus = 'paid'
  } else {
    orderData.value.paymentStatus = 'partially_paid'
  }
}

const incrementQuantity = () => {
  orderData.value.quantity++
}

const decrementQuantity = () => {
  if (orderData.value.quantity > 1) {
    orderData.value.quantity--
  }
}

const getPaymentColor = (status) => {
  const colors = {
    paid: 'green',
    unpaid: 'red',
    partially_paid: 'orange'
  }
  return colors[status] || 'gray'
}

watch(() => orderData.value.productType, () => {
  orderData.value.productSubtype = ''
})

const createOrder = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    updatePaymentStatus()

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    const payload = {
      ...orderData.value,
      orderId,
      priority: 'normal',
      createdAt: new Date().toISOString()
    }

    await orderStore.createOrder(payload)

    toast.add({
      title: 'Order Created',
      description: `Order ${orderId} for ${orderData.value.customerName} created successfully`,
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })

    // Reset form
    orderData.value = {
      customerName: '',
      customerPhone: '',
      productType: '',
      productSubtype: '',
      quantity: 1,
      totalAmount: 0,
      amountPaid: 0,
      paymentStatus: 'unpaid',
      deliveryLocation: '',
      deliveryStatus: 'pending',
      notes: ''
    }
  } catch (error) {
    errorMessage.value = error.message || 'Failed to create order'
    toast.add({
      title: 'Order Failed',
      description: error.message,
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  orderStore.initSocket()
  stockStore.initSocket()
  orderStore.fetchOrders()
})

onUnmounted(() => {
  orderStore.disconnectSocket()
  stockStore.disconnectSocket()
})
</script>
