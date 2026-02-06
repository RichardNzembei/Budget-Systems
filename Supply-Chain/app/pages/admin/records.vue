<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight mb-2">Reports & Analytics</h1>
      <p class="text-zinc-500">Track sales history and stock changes</p>
    </div>

    <!-- View Tabs -->
    <div class="mb-6 flex gap-2 border-b border-zinc-800">
      <button
        @click="currentView = 'sales'"
        class="px-6 py-3 font-medium transition-all relative"
        :class="
          currentView === 'sales'
            ? 'text-blue-400'
            : 'text-zinc-500 hover:text-white'
        "
      >
        <UIcon name="i-heroicons-shopping-cart" class="w-5 h-5 inline mr-2" />
        Sales Records
        <div
          v-if="currentView === 'sales'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"
        ></div>
      </button>
      <button
        @click="currentView = 'stock'"
        class="px-6 py-3 font-medium transition-all relative"
        :class="
          currentView === 'stock'
            ? 'text-blue-400'
            : 'text-zinc-500 hover:text-white'
        "
      >
        <UIcon name="i-heroicons-cube" class="w-5 h-5 inline mr-2" />
        Stock History
        <div
          v-if="currentView === 'stock'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600"
        ></div>
      </button>
    </div>

    <!-- Filters for Sales -->
    <div v-if="currentView === 'sales'" class="mb-6">
      <div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in filterOptions"
            :key="option.value"
            @click="setFilter(option.value)"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            :class="
              filter === option.value
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
            "
          >
            {{ option.label }}
          </button>
        </div>

        <div class="flex items-center gap-3">
          <UBadge color="zinc" variant="subtle">
            {{ currentRecordsCount }} records
          </UBadge>
          <button
            @click="exportData"
            class="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 inline mr-2" />
            Export
          </button>
        </div>
      </div>

      <!-- Date Range Picker -->
      <div v-if="showDateRange" class="mt-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2">Start Date</label>
            <input
              v-model="dateRange.start"
              type="date"
              class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">End Date</label>
            <input
              v-model="dateRange.end"
              type="date"
              class="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div class="flex items-end gap-2">
            <button
              @click="applyDateRange"
              class="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
            >
              Apply
            </button>
            <button
              @click="clearDateRange"
              class="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sales Records Table -->
    <div v-if="currentView === 'sales'">
      <div v-if="salesStore.loading" class="space-y-2">
        <div v-for="n in 5" :key="n" class="h-16 bg-zinc-900 border border-zinc-800 rounded-lg animate-pulse"></div>
      </div>

      <div v-else-if="filteredSalesRecords.length === 0" class="text-center py-20">
        <UIcon name="i-heroicons-document-text" class="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p class="text-zinc-500 text-lg mb-2">No sales records found</p>
        <p class="text-zinc-600 text-sm">Try adjusting your date filter</p>
      </div>

      <div v-else class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Product</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Subtype</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Quantity</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Date</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Time</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Actions</th>
            </tr>
            </thead>
            <tbody>
            <tr
              v-for="(record, index) in filteredSalesRecords"
              :key="record.id"
              class="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
            >
              <td class="px-6 py-4">
                <UBadge color="blue" variant="subtle">
                  {{ record.productType }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-sm text-zinc-300">{{ record.productSubtype }}</td>
              <td class="px-6 py-4">
                <span class="font-semibold text-green-400">{{ record.quantitySold }}</span>
              </td>
              <td class="px-6 py-4 text-sm text-zinc-400">{{ record.date }}</td>
              <td class="px-6 py-4 text-sm text-zinc-400">{{ record.time }}</td>
              <td class="px-6 py-4">
                <button
                  @click="restoreSale(record)"
                  class="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-400 transition-all"
                >
                  <UIcon name="i-heroicons-arrow-path" class="w-3 h-3 inline mr-1" />
                  Restore
                </button>
              </td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Stock History Table -->
    <div v-if="currentView === 'stock'">
      <div v-if="stockStore.loading" class="space-y-2">
        <div v-for="n in 5" :key="n" class="h-16 bg-zinc-900 border border-zinc-800 rounded-lg animate-pulse"></div>
      </div>

      <div v-else-if="filteredStockHistory.length === 0" class="text-center py-20">
        <UIcon name="i-heroicons-cube-transparent" class="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <p class="text-zinc-500 text-lg mb-2">No stock history found</p>
        <p class="text-zinc-600 text-sm">Stock changes will appear here</p>
      </div>

      <div v-else class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-zinc-950 border-b border-zinc-800">
            <tr>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Product</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Subtype</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Quantity</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Action</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Date</th>
              <th class="px-6 py-4 text-left text-sm font-semibold text-zinc-400">Time</th>
            </tr>
            </thead>
            <tbody>
            <tr
              v-for="record in filteredStockHistory"
              :key="`${record.productType}-${record.timestamp}`"
              class="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
            >
              <td class="px-6 py-4">
                <UBadge color="blue" variant="subtle">
                  {{ record.productType }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-sm text-zinc-300">{{ record.productSubtype }}</td>
              <td class="px-6 py-4 font-semibold">{{ record.quantity }}</td>
              <td class="px-6 py-4">
                <UBadge
                  :color="getActionColor(record.action)"
                  variant="subtle"
                >
                  {{ record.action }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-sm text-zinc-400">{{ record.date }}</td>
              <td class="px-6 py-4 text-sm text-zinc-400">{{ record.time }}</td>
            </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSalesStore } from '@/stores/salesStore'
import { useStockStore } from '@/stores/stockStore'
definePageMeta({
  layout: 'admin',
 // middleware: ['auth']   // ← redirect to login if no user in localStorage
})
const salesStore = useSalesStore()
const stockStore = useStockStore()
const toast = useToast()

const currentView = ref('sales')
const filter = ref('last4Days')
const showDateRange = ref(false)
const dateRange = ref({ start: null, end: null })

const filterOptions = [
  { label: 'Today', value: 'daily' },
  { label: 'Last 4 Days', value: 'last4Days' },
  { label: 'Custom Range', value: 'custom' },
  { label: 'All Time', value: 'allTime' }
]

const currentRecordsCount = computed(() => {
  return currentView.value === 'sales'
    ? filteredSalesRecords.value.length
    : filteredStockHistory.value.length
})

const filteredSalesRecords = computed(() => {
  if (!salesStore.sales) return []

  const now = new Date()
  const fiveDaysAgo = new Date(now)
  fiveDaysAgo.setDate(now.getDate() - 5)

  return salesStore.sales
    .filter(sale => {
      const saleDate = new Date(sale.saleTime)
      if (filter.value === 'daily') {
        return saleDate.toDateString() === now.toDateString()
      } else if (filter.value === 'last4Days') {
        return saleDate >= fiveDaysAgo && saleDate <= now
      } else if (filter.value === 'allTime') {
        return true
      } else if (filter.value === 'custom' && dateRange.value.start && dateRange.value.end) {
        const start = new Date(dateRange.value.start)
        const end = new Date(dateRange.value.end)
        end.setHours(23, 59, 59, 999)
        return saleDate >= start && saleDate <= end
      }
      return true
    })
    .map(sale => ({
      ...sale,
      date: new Date(sale.saleTime).toLocaleDateString(),
      time: new Date(sale.saleTime).toLocaleTimeString()
    }))
    .sort((a, b) => new Date(b.saleTime) - new Date(a.saleTime))
})

const filteredStockHistory = computed(() => {
  if (!stockStore.stockHistory) return []

  return stockStore.stockHistory
    .map(record => ({
      ...record,
      quantity: record.quantity || record.newQuantity,
      date: new Date(record.timestamp).toLocaleDateString(),
      time: new Date(record.timestamp).toLocaleTimeString()
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

const getActionColor = (action) => {
  const colors = {
    added: 'green',
    removed: 'red',
    updated: 'blue',
    edited: 'blue'
  }
  return colors[action] || 'gray'
}

const setFilter = async (value) => {
  filter.value = value
  showDateRange.value = value === 'custom'

  if (value === 'allTime') {
    await salesStore.fetchAllTimeSales()
  } else if (value !== 'custom') {
    await salesStore.fetchSales()
  }
}

const applyDateRange = async () => {
  if (!dateRange.value.start || !dateRange.value.end) {
    toast.add({
      title: 'Invalid Range',
      description: 'Please select both dates',
      color: 'orange',
      icon: 'i-heroicons-exclamation-triangle'
    })
    return
  }

  await salesStore.fetchSalesByDateRange(dateRange.value.start, dateRange.value.end)
}

const clearDateRange = () => {
  dateRange.value = { start: null, end: null }
  filter.value = 'last4Days'
  showDateRange.value = false
  salesStore.fetchSales()
}

const restoreSale = async (record) => {
  try {
    await salesStore.deleteSale(
      record.id,
      record.productType,
      record.productSubtype,
      record.quantitySold
    )

    toast.add({
      title: 'Sale Restored',
      description: 'Stock has been restored',
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })
  } catch (error) {
    toast.add({
      title: 'Restore Failed',
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  }
}

const exportData = () => {
  const data = currentView.value === 'sales' ? filteredSalesRecords.value : filteredStockHistory.value
  const csv = convertToCSV(data)
  downloadCSV(csv, `${currentView.value}-report-${new Date().toISOString().split('T')[0]}.csv`)
}

const convertToCSV = (data) => {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0]).join(',')
  const rows = data.map(row => Object.values(row).join(','))
  return [headers, ...rows].join('\n')
}

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

watch(currentView, async (newView) => {
  if (newView === 'stock') {
    await stockStore.fetchStockHistory()
  } else {
    await salesStore.fetchSales()
  }
})

onMounted(async () => {
  stockStore.initSocket()
  salesStore.initSocket()
  await salesStore.fetchSales()
})

onUnmounted(() => {
  stockStore.disconnectSocket()
  salesStore.disconnectSocket()
})
</script>
