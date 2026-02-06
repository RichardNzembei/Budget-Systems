<template>
  <div class="min-h-screen bg-black p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight mb-2 text-white">Orders Management</h1>
        <p class="text-zinc-500">View and manage all customer orders</p>
      </div>
      <NuxtLink
        to="/admin/create-order"
        class="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 text-white"
      >
        <UIcon name="i-heroicons-plus" class="w-5 h-5" />
        New Order
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button
        v-for="filter in statusFilters"
        :key="filter.value"
        @click="activeFilter = filter.value"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="activeFilter === filter.value
          ? `bg-${filter.color}-500/20 text-${filter.color}-400 border border-${filter.color}-500/30`
          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'"
      >
        {{ filter.label }}
        <span class="ml-2 text-xs opacity-70">({{ getOrderCount(filter.value) }})</span>
      </button>
    </div>

    <!-- Orders Table -->
    <div class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="p-8">
        <div class="space-y-4">
          <div v-for="n in 5" :key="n" class="h-20 bg-zinc-800/30 rounded-lg animate-pulse"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredOrders.length === 0" class="p-12 text-center">
        <UIcon name="i-heroicons-shopping-bag" class="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p class="text-zinc-500 text-lg mb-2">No orders found</p>
        <p class="text-zinc-600 text-sm">Create your first order to get started</p>
      </div>

      <!-- Orders List -->
      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-zinc-950 border-b border-zinc-800">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Order ID
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Customer
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Product
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Qty
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Amount
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Payment
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Status
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Priority
            </th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
          </thead>
          <tbody class="divide-y divide-zinc-800">
          <tr
            v-for="order in filteredOrders"
            :key="order.id"
            class="hover:bg-zinc-800/30 transition-colors"
            :class="order.priority === 'high' ? 'bg-red-500/5' : ''"
          >
            <!-- Order ID -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <code class="text-sm font-mono text-blue-400">{{ order.orderId }}</code>
                <button
                  v-if="order.priority === 'high'"
                  class="w-2 h-2 rounded-full bg-red-500 animate-pulse"
                  title="High Priority"
                ></button>
              </div>
            </td>

            <!-- Customer -->
            <td class="px-6 py-4">
              <div>
                <p class="text-sm font-medium text-white">{{ order.customerName }}</p>
                <p class="text-xs text-zinc-500">{{ order.customerPhone }}</p>
              </div>
            </td>

            <!-- Product -->
            <td class="px-6 py-4">
              <div>
                <p class="text-sm text-white">{{ order.productType }}</p>
                <p class="text-xs text-zinc-500">{{ order.productSubtype }}</p>
              </div>
            </td>

            <!-- Quantity -->
            <td class="px-6 py-4">
              <span class="text-sm font-semibold text-white">{{ order.quantity }}</span>
            </td>

            <!-- Amount -->
            <td class="px-6 py-4">
              <div>
                <p class="text-sm font-semibold text-white">${{ order.totalAmount }}</p>
                <p class="text-xs text-zinc-500">Paid: ${{ order.amountPaid }}</p>
              </div>
            </td>

            <!-- Payment Status -->
            <td class="px-6 py-4">
              <UBadge
                :color="getPaymentColor(order.paymentStatus)"
                variant="subtle"
                size="sm"
              >
                {{ formatStatus(order.paymentStatus) }}
              </UBadge>
            </td>

            <!-- Delivery Status -->
            <td class="px-6 py-4">
              <UBadge
                :color="getDeliveryColor(order.deliveryStatus)"
                variant="subtle"
                size="sm"
              >
                {{ formatStatus(order.deliveryStatus) }}
              </UBadge>
            </td>

            <!-- Priority -->
            <td class="px-6 py-4">
              <button
                @click="togglePriority(order)"
                class="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors"
                :class="order.priority === 'high'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'"
              >
                <UIcon name="i-heroicons-flag" class="w-3 h-3" />
                {{ order.priority === 'high' ? 'High' : 'Normal' }}
              </button>
            </td>

            <!-- Actions -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <button
                  @click="viewOrder(order)"
                  class="p-2 hover:bg-blue-500/20 rounded-lg transition-colors group"
                  title="View Details"
                >
                  <UIcon name="i-heroicons-eye" class="w-4 h-4 text-zinc-500 group-hover:text-blue-400" />
                </button>
                <button
                  @click="openReturnModal(order)"
                  class="p-2 hover:bg-orange-500/20 rounded-lg transition-colors group"
                  title="Return Order"
                >
                  <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4 text-zinc-500 group-hover:text-orange-400" />
                </button>
                <button
                  @click="cancelOrder(order)"
                  class="p-2 hover:bg-yellow-500/20 rounded-lg transition-colors group"
                  title="Cancel Order"
                >
                  <UIcon name="i-heroicons-x-circle" class="w-4 h-4 text-zinc-500 group-hover:text-yellow-400" />
                </button>
                <button
                  @click="deleteOrder(order)"
                  class="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                  title="Delete Order"
                >
                  <UIcon name="i-heroicons-trash" class="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                </button>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- View Order Modal -->
    <div
      v-if="showViewModal && selectedOrder"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showViewModal = false"
    >
      <div
        class="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <!-- Modal Header -->
        <div class="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <UIcon name="i-heroicons-shopping-bag" class="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">Order Details</h2>
              <code class="text-sm text-blue-400">{{ selectedOrder.orderId }}</code>
            </div>
          </div>
          <button
            @click="showViewModal = false"
            class="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- Customer Info -->
          <div class="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-zinc-400 mb-3">Customer Information</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-zinc-500 mb-1">Name</p>
                <p class="text-sm text-white font-medium">{{ selectedOrder.customerName }}</p>
              </div>
              <div>
                <p class="text-xs text-zinc-500 mb-1">Phone</p>
                <p class="text-sm text-white font-medium">{{ selectedOrder.customerPhone }}</p>
              </div>
            </div>
          </div>

          <!-- Product Info -->
          <div class="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-zinc-400 mb-3">Product Details</h3>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <p class="text-xs text-zinc-500 mb-1">Type</p>
                <p class="text-sm text-white font-medium">{{ selectedOrder.productType }}</p>
              </div>
              <div>
                <p class="text-xs text-zinc-500 mb-1">Subtype</p>
                <p class="text-sm text-white font-medium">{{ selectedOrder.productSubtype }}</p>
              </div>
              <div>
                <p class="text-xs text-zinc-500 mb-1">Quantity</p>
                <p class="text-sm text-blue-400 font-semibold">{{ selectedOrder.quantity }} units</p>
              </div>
            </div>
          </div>

          <!-- Payment Info -->
          <div class="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-zinc-400 mb-3">Payment Information</h3>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span class="text-sm text-zinc-500">Total Amount:</span>
                <span class="text-sm font-semibold text-white">${{ selectedOrder.totalAmount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-zinc-500">Amount Paid:</span>
                <span class="text-sm font-semibold text-green-400">${{ selectedOrder.amountPaid }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-sm text-zinc-500">Balance:</span>
                <span class="text-sm font-semibold text-orange-400">
                  ${{ (selectedOrder.totalAmount - selectedOrder.amountPaid).toFixed(2) }}
                </span>
              </div>
              <div class="flex justify-between pt-2 border-t border-zinc-800">
                <span class="text-sm text-zinc-500">Status:</span>
                <UBadge :color="getPaymentColor(selectedOrder.paymentStatus)" variant="subtle">
                  {{ formatStatus(selectedOrder.paymentStatus) }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Delivery Info -->
          <div class="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-zinc-400 mb-3">Delivery Information</h3>
            <div class="space-y-3">
              <div>
                <p class="text-xs text-zinc-500 mb-1">Location</p>
                <div class="flex items-start gap-2">
                  <UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-blue-400 mt-0.5" />
                  <p class="text-sm text-white">{{ selectedOrder.deliveryLocation }}</p>
                </div>
              </div>
              <div>
                <p class="text-xs text-zinc-500 mb-1">Status</p>
                <UBadge :color="getDeliveryColor(selectedOrder.deliveryStatus)" variant="subtle">
                  {{ formatStatus(selectedOrder.deliveryStatus) }}
                </UBadge>
              </div>
              <div v-if="selectedOrder.deliveredAt">
                <p class="text-xs text-zinc-500 mb-1">Delivered At</p>
                <p class="text-sm text-white">{{ formatDate(selectedOrder.deliveredAt) }}</p>
                <p class="text-xs text-zinc-500">By: {{ selectedOrder.deliveredBy }}</p>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="selectedOrder.notes || selectedOrder.workerNotes" class="space-y-3">
            <div v-if="selectedOrder.notes" class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-blue-400 mb-2">Admin Notes</h3>
              <p class="text-sm text-zinc-300">{{ selectedOrder.notes }}</p>
            </div>
            <div v-if="selectedOrder.workerNotes" class="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h3 class="text-sm font-semibold text-green-400 mb-2">Worker Notes</h3>
              <p class="text-sm text-zinc-300">{{ selectedOrder.workerNotes }}</p>
            </div>
          </div>

          <!-- Timeline -->
          <div class="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <h3 class="text-sm font-semibold text-zinc-400 mb-3">Order Timeline</h3>
            <div class="space-y-3">
              <div class="flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p class="text-sm text-white">Order Created</p>
                  <p class="text-xs text-zinc-500">{{ formatDate(selectedOrder.createdAt) }}</p>
                </div>
              </div>
              <div v-if="selectedOrder.deliveredAt" class="flex items-start gap-3">
                <div class="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                <div>
                  <p class="text-sm text-white">Order Delivered</p>
                  <p class="text-xs text-zinc-500">{{ formatDate(selectedOrder.deliveredAt) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Return Order Modal -->
    <div
      v-if="showReturnModal && selectedOrder"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showReturnModal = false"
    >
      <div
        class="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl max-w-md w-full p-6"
        @click.stop
      >
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-arrow-uturn-left" class="w-8 h-8 text-orange-400" />
          </div>
          <h2 class="text-xl font-bold text-white mb-2">Return Order</h2>
          <p class="text-zinc-400">Select return type for order {{ selectedOrder.orderId }}</p>
        </div>

        <div class="space-y-3 mb-6">
          <button
            @click="processReturn('full')"
            class="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-orange-500/50 transition-all text-left"
          >
            <p class="font-semibold text-white mb-1">Full Return</p>
            <p class="text-sm text-zinc-500">Return entire order ({{ selectedOrder.quantity }} units)</p>
          </button>
          <button
            @click="openPartialReturn()"
            class="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-orange-500/50 transition-all text-left"
          >
            <p class="font-semibold text-white mb-1">Partial Return</p>
            <p class="text-sm text-zinc-500">Return some units</p>
          </button>
        </div>

        <button
          @click="showReturnModal = false"
          class="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg font-medium hover:bg-zinc-800 transition-colors text-white"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Partial Return Modal -->
    <div
      v-if="showPartialReturnModal && selectedOrder"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showPartialReturnModal = false"
    >
      <div
        class="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl max-w-md w-full p-6"
        @click.stop
      >
        <h2 class="text-xl font-bold text-white mb-6">Partial Return</h2>

        <div class="mb-6">
          <label class="block text-sm font-medium mb-3 text-white">Quantity to Return</label>
          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="returnQuantity > 1 ? returnQuantity-- : null"
              class="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
            >
              <UIcon name="i-heroicons-minus" class="w-5 h-5 text-white" />
            </button>
            <input
              v-model.number="returnQuantity"
              type="number"
              min="1"
              :max="selectedOrder.quantity"
              class="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-3 text-center text-2xl font-bold text-white focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <button
              type="button"
              @click="returnQuantity < selectedOrder.quantity ? returnQuantity++ : null"
              class="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center"
            >
              <UIcon name="i-heroicons-plus" class="w-5 h-5 text-white" />
            </button>
          </div>
          <p class="text-sm text-zinc-500 mt-2">Max: {{ selectedOrder.quantity }} units</p>
        </div>

        <div class="flex gap-3">
          <button
            @click="showPartialReturnModal = false"
            class="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg font-medium hover:bg-zinc-800 transition-colors text-white"
          >
            Cancel
          </button>
          <button
            @click="processReturn('partial')"
            :disabled="loading"
            class="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 text-white"
          >
            {{ loading ? 'Processing...' : 'Confirm Return' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useOrderStore } from '@/stores/orderStore'

definePageMeta({
  layout: 'admin',
})

const orderStore = useOrderStore()
const toast = useToast()

const activeFilter = ref('all')
const loading = ref(false)
const showViewModal = ref(false)
const showReturnModal = ref(false)
const showPartialReturnModal = ref(false)
const selectedOrder = ref(null)
const returnQuantity = ref(1)

const statusFilters = [
  { label: 'All Orders', value: 'all', color: 'blue' },
  { label: 'Pending', value: 'pending', color: 'orange' },
  { label: 'In Transit', value: 'in_transit', color: 'blue' },
  { label: 'Delivered', value: 'delivered', color: 'green' },
  { label: 'Returned', value: 'returned', color: 'red' },
  { label: 'Cancelled', value: 'cancelled', color: 'yellow' },
  { label: 'High Priority', value: 'high_priority', color: 'red' }
]

const filteredOrders = computed(() => {
  let orders = orderStore.orders

  if (activeFilter.value === 'high_priority') {
    orders = orders.filter(order => order.priority === 'high')
  } else if (activeFilter.value !== 'all') {
    orders = orders.filter(order => order.deliveryStatus === activeFilter.value)
  }

  return orders.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1
    if (a.priority !== 'high' && b.priority === 'high') return 1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

const getOrderCount = (status) => {
  if (status === 'all') return orderStore.orders.length
  if (status === 'high_priority') {
    return orderStore.orders.filter(o => o.priority === 'high').length
  }
  return orderStore.orders.filter(o => o.deliveryStatus === status).length
}

const getPaymentColor = (status) => {
  const colors = { paid: 'green', unpaid: 'red', partially_paid: 'orange' }
  return colors[status] || 'gray'
}

const getDeliveryColor = (status) => {
  const colors = {
    pending: 'orange',
    in_transit: 'blue',
    delivered: 'green',
    returned: 'red',
    cancelled: 'yellow'
  }
  return colors[status] || 'gray'
}

const formatStatus = (status) => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const viewOrder = (order) => {
  selectedOrder.value = order
  showViewModal.value = true
}

const togglePriority = async (order) => {
  try {
    const newPriority = order.priority === 'high' ? 'normal' : 'high'
    await orderStore.updateOrderPriority(order.id, newPriority)
    toast.add({
      title: 'Priority Updated',
      description: `Order marked as ${newPriority} priority`,
      color: 'blue',
      icon: 'i-heroicons-flag'
    })
  } catch (error) {
    toast.add({
      title: 'Update Failed',
      description: error.message,
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  }
}

const openReturnModal = (order) => {
  selectedOrder.value = order
  showReturnModal.value = true
}

const openPartialReturn = () => {
  returnQuantity.value = 1
  showReturnModal.value = false
  showPartialReturnModal.value = true
}

const processReturn = async (type) => {
  if (!selectedOrder.value) return

  loading.value = true

  try {
    const quantity = type === 'full' ? selectedOrder.value.quantity : returnQuantity.value

    await orderStore.returnOrder(selectedOrder.value.id, quantity, type)

    toast.add({
      title: 'Order Returned',
      description: `${quantity} units returned successfully`,
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })

    showReturnModal.value = false
    showPartialReturnModal.value = false
    selectedOrder.value = null
  } catch (error) {
    toast.add({
      title: 'Return Failed',
      description: error.message,
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  } finally {
    loading.value = false
  }
}

const cancelOrder = async (order) => {
  const confirmed = confirm(`Cancel order ${order.orderId}?`)
  if (!confirmed) return

  try {
    await orderStore.cancelOrder(order.id)
    toast.add({
      title: 'Order Cancelled',
      description: 'Order has been cancelled successfully',
      color: 'yellow',
      icon: 'i-heroicons-x-circle'
    })
  } catch (error) {
    toast.add({
      title: 'Cancel Failed',
      description: error.message,
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  }
}

const deleteOrder = async (order) => {
  const confirmed = confirm(`Permanently delete order ${order.orderId}? This cannot be undone.`)
  if (!confirmed) return

  try {
    await orderStore.deleteOrder(order.id)
    toast.add({
      title: 'Order Deleted',
      description: 'Order has been permanently deleted',
      color: 'green',
      icon: 'i-heroicons-trash'
    })
  } catch (error) {
    toast.add({
      title: 'Delete Failed',
      description: error.message,
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
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
