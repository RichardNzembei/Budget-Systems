<template>
  <div class="min-h-screen bg-black text-white p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight mb-2">Dashboard Overview</h1>
      <p class="text-zinc-500">Real-time insights into your inventory and sales</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Total Products -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-blue-500/30 transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-cube" class="w-6 h-6 text-blue-400" />
          </div>
          <UBadge color="blue" variant="subtle" size="xs">Live</UBadge>
        </div>
        <p class="text-3xl font-bold mb-1">{{ totalProducts }}</p>
        <p class="text-sm text-zinc-500">Total Products</p>
      </div>

      <!-- Sales Today -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-green-500/30 transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-6 h-6 text-green-400" />
          </div>
          <UBadge color="green" variant="subtle" size="xs">Today</UBadge>
        </div>
        <p class="text-3xl font-bold mb-1">{{ todaySalesCount }}</p>
        <p class="text-sm text-zinc-500">Sales Today</p>
      </div>

      <!-- Low Stock -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-orange-500/30 transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-orange-400" />
          </div>
          <UBadge color="orange" variant="subtle" size="xs">Alert</UBadge>
        </div>
        <p class="text-3xl font-bold mb-1">{{ lowStockCount }}</p>
        <p class="text-sm text-zinc-500">Low Stock Items</p>
      </div>

      <!-- Weekly Sales -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-purple-500/30 transition-all">
        <div class="flex items-center justify-between mb-4">
          <div class="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <UIcon name="i-heroicons-clock" class="w-6 h-6 text-purple-400" />
          </div>
          <UBadge color="purple" variant="subtle" size="xs">7 Days</UBadge>
        </div>
        <p class="text-3xl font-bold mb-1">{{ weekSalesCount }}</p>
        <p class="text-sm text-zinc-500">Weekly Sales</p>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Sales -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div class="p-6 border-b border-zinc-800">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5 text-blue-400" />
              Recent Sales
            </h2>
            <button @click="refreshSales" class="text-blue-400 hover:text-blue-300 transition-colors">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="p-6 max-h-96 overflow-y-auto">
          <div v-if="salesStore.loading" class="space-y-3">
            <div v-for="n in 3" :key="n" class="h-16 bg-zinc-800/30 rounded-lg animate-pulse"></div>
          </div>

          <div v-else-if="todaySales.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-shopping-cart" class="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p class="text-zinc-500">No sales today</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="sale in todaySales"
              :key="sale.id"
              class="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-all"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-blue-400">{{ sale.productType }}</span>
                    <span class="text-zinc-600">/</span>
                    <span class="text-sm text-zinc-400">{{ sale.productSubtype }}</span>
                  </div>
                  <p class="text-xs text-zinc-500">
                    Quantity: <span class="text-white font-semibold">{{ sale.quantitySold }}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-zinc-500">{{ formatTime(sale.saleTime) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Stock Alerts -->
      <div class="bg-zinc-900 border border-zinc-800 rounded-xl">
        <div class="p-6 border-b border-zinc-800">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <UIcon name="i-heroicons-cube-transparent" class="w-5 h-5 text-blue-400" />
              Stock Alerts
            </h2>
            <UBadge color="orange" variant="subtle">{{ lowStockItems.length }}</UBadge>
          </div>
        </div>

        <div class="p-6 max-h-96 overflow-y-auto">
          <div v-if="stockStore.loading" class="space-y-3">
            <div v-for="n in 3" :key="n" class="h-16 bg-zinc-800/30 rounded-lg animate-pulse"></div>
          </div>

          <div v-else-if="lowStockItems.length === 0" class="text-center py-12">
            <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p class="text-zinc-500">All stock levels healthy</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in lowStockItems"
              :key="`${item.type}-${item.subtype}`"
              class="bg-zinc-800/30 border border-zinc-800 rounded-lg p-4 hover:bg-zinc-800/50 transition-all"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-sm font-medium text-white">{{ item.type }}</span>
                    <span class="text-zinc-600">/</span>
                    <span class="text-sm text-zinc-400">{{ item.subtype }}</span>
                  </div>
                  <div class="flex items-center gap-2 mt-2">
                    <div class="flex-1 bg-zinc-950 rounded-full h-2">
                      <div
                        class="h-full rounded-full transition-all"
                        :class="item.quantity === 0 ? 'bg-red-500' : 'bg-orange-500'"
                        :style="{ width: `${Math.min((item.quantity / 10) * 100, 100)}%` }"
                      ></div>
                    </div>
                    <UBadge :color="item.quantity === 0 ? 'red' : 'orange'" variant="subtle" size="xs">
                      {{ item.quantity }} left
                    </UBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStockStore } from '@/stores/stockStore'
import { useSalesStore } from '@/stores/salesStore'
definePageMeta({
  layout: 'admin',
  // middleware: ['auth']   // ← redirect to login if no user in localStorage
})
const stockStore = useStockStore()
const salesStore = useSalesStore()

const totalProducts = computed(() => {
  let count = 0
  Object.values(stockStore.stock).forEach(subtypes => {
    count += Object.keys(subtypes).length
  })
  return count
})

const lowStockItems = computed(() => {
  const items = []
  Object.entries(stockStore.stock).forEach(([type, subtypes]) => {
    Object.entries(subtypes).forEach(([subtype, quantity]) => {
      if (quantity < 5) {
        items.push({ type, subtype, quantity })
      }
    })
  })
  return items.sort((a, b) => a.quantity - b.quantity)
})

const lowStockCount = computed(() => lowStockItems.value.length)

const todaySales = computed(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return salesStore.sales
    .filter(sale => {
      const saleDate = new Date(sale.saleTime)
      saleDate.setHours(0, 0, 0, 0)
      return saleDate.getTime() === today.getTime()
    })
    .sort((a, b) => new Date(b.saleTime) - new Date(a.saleTime))
    .slice(0, 10)
})

const todaySalesCount = computed(() => todaySales.value.length)

const weekSalesCount = computed(() => {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  return salesStore.sales.filter(sale => new Date(sale.saleTime) >= weekAgo).length
})

const formatTime = (time) => {
  return new Date(time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const refreshSales = async () => {
  await salesStore.fetchSales()
}

onMounted(() => {
  stockStore.initSocket()
  salesStore.initSocket()
})

onUnmounted(() => {
  stockStore.disconnectSocket()
  salesStore.disconnectSocket()
})
</script>
