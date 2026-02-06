<template>
  <div class="min-h-screen bg-black p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight mb-2 text-white">Delivery Orders</h1>
      <p class="text-zinc-500">View and confirm order deliveries</p>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button
        @click="filterType = 'all'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="filterType === 'all' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'"
      >
        All Orders
      </button>
      <button
        @click="filterType = 'pending'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="filterType === 'pending' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'"
      >
        Pending
      </button>
      <button
        @click="filterType === 'delivered'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="filterType === 'delivered' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'"
      >
        Delivered
      </button>
    </div>

    <!-- Orders List -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="h-64 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"></div>
    </div>

    <div v-else-if="filteredOrders.length === 0" class="text-center py-20">
      <UIcon name="i-heroicons-shopping-bag" class="w-16 h-16 text-zinc-700 mx-auto mb-4" />
      <p class="text-zinc-500 text-lg mb-2">No orders found</p>
      <p class="text-zinc-600 text-sm">Orders will appear here</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-blue-500/30 transition-all"
      >
        <!-- Order Header -->
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="font-semibold text-lg text-white">{{ order.customerName }}</h3>
            <p class="text-sm text-zinc-400">{{ order.customerPhone }}</p>
          </div>
          <UBadge
            :color="order.deliveryStatus === 'delivered' ? 'green' : order.deliveryStatus === 'in_transit' ? 'blue' : 'orange'"
            variant="subtle"
          >
            {{ formatStatus(order.deliveryStatus) }}
          </UBadge>
        </div>

        <!-- Product Details -->
        <div class="space-y-2 mb-4 pb-4 border-b border-zinc-800">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">Product:</span>
            <span class="text-sm font-medium text-white">{{ order.productType }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">Subtype:</span>
            <span class="text-sm font-medium text-white">{{ order.productSubtype }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">Quantity:</span>
            <span class="text-sm font-semibold text-blue-400">{{ order.quantity }} units</span>
          </div>
        </div>

        <!-- Payment Status -->
        <div class="mb-4 pb-4 border-b border-zinc-800">
          <div class="flex items-center justify-between">
            <span class="text-sm text-zinc-500">Payment:</span>
            <UBadge
              :color="getPaymentColor(order.paymentStatus)"
              variant="subtle"
              size="xs"
            >
              {{ formatStatus(order.paymentStatus) }}
            </UBadge>
          </div>
        </div>

        <!-- Delivery Location -->
        <div class="mb-4">
          <div class="flex items-start gap-2">
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p class="text-sm text-zinc-400">{{ order.deliveryLocation }}</p>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="order.notes" class="mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          <p class="text-xs text-zinc-500 mb-1">Notes:</p>
          <p class="text-sm text-zinc-300">{{ order.notes }}</p>
        </div>

        <!-- Delivery Button -->
        <button
          v-if="order.deliveryStatus !== 'delivered'"
          @click="confirmDelivery(order)"
          class="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg font-medium transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/30 flex items-center justify-center gap-2 text-white"
        >
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5" />
          Confirm Delivery
        </button>

        <div v-else>
          <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-check-badge" class="w-5 h-5 text-green-400" />
              <div class="flex-1">
                <p class="text-sm font-medium text-green-400">Delivered</p>
                <p class="text-xs text-zinc-500">{{ formatDate(order.deliveredAt) }}</p>
                <p class="text-xs text-zinc-500">By: {{ order.deliveredBy }}</p>
              </div>
            </div>
          </div>

          <!-- Add Worker Notes -->
          <button
            v-if="!order.workerNotes"
            @click="openNotesModal(order)"
            class="w-full py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-white"
          >
            <UIcon name="i-heroicons-pencil-square" class="w-4 h-4" />
            Add Notes
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showConfirmModal = false"
    >
      <div
        class="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl max-w-md w-full p-6"
        @click.stop
      >
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-400" />
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Confirm Delivery</h2>
          <p class="text-zinc-400">Are you sure you want to mark this order as delivered?</p>
        </div>

        <div v-if="selectedOrder" class="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-6">
          <p class="text-sm text-zinc-500 mb-1">Customer:</p>
          <p class="font-medium text-white">{{ selectedOrder.customerName }}</p>
          <p class="text-sm text-zinc-400 mt-2">{{ selectedOrder.productType }} / {{ selectedOrder.productSubtype }}</p>
        </div>

        <div class="flex gap-3">
          <button
            @click="showConfirmModal = false"
            class="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg font-medium hover:bg-zinc-800 transition-colors text-white"
          >
            Cancel
          </button>
          <button
            @click="processDelivery"
            :disabled="loading"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 text-white"
          >
            {{ loading ? 'Processing...' : 'Confirm' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Worker Notes Modal -->
    <div
      v-if="showNotesModal"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showNotesModal = false"
    >
      <div
        class="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl max-w-md w-full p-6"
        @click.stop
      >
        <h2 class="text-xl font-bold text-white mb-6">Add Delivery Notes</h2>

        <div class="mb-6">
          <label class="block text-sm font-medium mb-2 text-white">Notes</label>
          <textarea
            v-model="workerNotes"
            rows="5"
            placeholder="Add notes about the delivery..."
            class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button
            @click="showNotesModal = false"
            class="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg font-medium hover:bg-zinc-800 transition-colors text-white"
          >
            Cancel
          </button>
          <button
            @click="saveWorkerNotes"
            :disabled="loading || !workerNotes.trim()"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 text-white"
          >
            {{ loading ? 'Saving...' : 'Save Notes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useOrderStore } from '@/stores/orderStore'

definePageMeta({
  layout: 'worker',
})

const orderStore = useOrderStore()
const toast = useToast()

const filterType = ref('all')
const loading = ref(false)
const showConfirmModal = ref(false)
const showNotesModal = ref(false)
const selectedOrder = ref(null)
const workerNotes = ref('')

const filteredOrders = computed(() => {
  let orders = orderStore.orders

  if (filterType.value === 'pending') {
    orders = orders.filter(order => order.deliveryStatus === 'pending' || order.deliveryStatus === 'in_transit')
  } else if (filterType.value === 'delivered') {
    orders = orders.filter(order => order.deliveryStatus === 'delivered')
  }

  return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const formatStatus = (status) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const getPaymentColor = (status) => {
  const colors = {
    paid: 'green',
    unpaid: 'red',
    partially_paid: 'orange'
  }
  return colors[status] || 'gray'
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const confirmDelivery = (order) => {
  selectedOrder.value = order
  showConfirmModal.value = true
}

const processDelivery = async () => {
  if (!selectedOrder.value) return

  loading.value = true

  try {
    const user = JSON.parse(localStorage.getItem('user'))
    const deliveredBy = user?.name || user?.username || 'Worker'

    await orderStore.updateOrderDeliveryStatus(
      selectedOrder.value.id,
      'delivered',
      deliveredBy
    )

    toast.add({
      title: 'Delivery Confirmed',
      description: 'Order marked as delivered successfully',
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })

    showConfirmModal.value = false
    selectedOrder.value = null
  } catch (error) {
    toast.add({
      title: 'Delivery Failed',
      description: error.message || 'Failed to confirm delivery',
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  } finally {
    loading.value = false
  }
}

const openNotesModal = (order) => {
  selectedOrder.value = order
  workerNotes.value = ''
  showNotesModal.value = true
}

const saveWorkerNotes = async () => {
  if (!selectedOrder.value || !workerNotes.value.trim()) return

  loading.value = true

  try {
    const user = JSON.parse(localStorage.getItem('user'))
    const workerName = user?.name || user?.username || 'Worker'

    await orderStore.addWorkerNotes(
      selectedOrder.value.id,
      workerNotes.value.trim(),
      workerName
    )

    toast.add({
      title: 'Notes Added',
      description: 'Delivery notes saved successfully',
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })

    showNotesModal.value = false
    selectedOrder.value = null
    workerNotes.value = ''
  } catch (error) {
    toast.add({
      title: 'Save Failed',
      description: error.message || 'Failed to save notes',
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  orderStore.initSocket()
  orderStore.fetchOrders()
})

onUnmounted(() => {
  orderStore.disconnectSocket()
})
</script>
