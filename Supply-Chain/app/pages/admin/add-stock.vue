<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight mb-2">Stock Management</h1>
      <p class="text-zinc-500">Add, edit, and manage your inventory</p>
    </div>

    <!-- Action Bar -->
    <div class="mb-6 flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <div class="relative">
          <UIcon
            name="i-heroicons-magnifying-glass"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search products..."
            class="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>
      </div>
      <button
        @click="showAddModal = true"
        class="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
      >
        <UIcon name="i-heroicons-plus" class="w-5 h-5 inline mr-2" />
        Add Stock
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap gap-3">
      <button
        @click="filterType = 'all'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="
          filterType === 'all'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
        "
      >
        All Stock
      </button>
      <button
        @click="filterType = 'low'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="
          filterType === 'low'
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
        "
      >
        Low Stock
      </button>
      <button
        @click="filterType = 'out'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
        :class="
          filterType === 'out'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
        "
      >
        Out of Stock
      </button>
    </div>

    <!-- Stock Grid -->
    <div v-if="stockStore.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="h-48 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse"></div>
    </div>

    <div v-else-if="filteredStock.length === 0" class="text-center py-20">
      <UIcon name="i-heroicons-cube-transparent" class="w-16 h-16 text-zinc-700 mx-auto mb-4" />
      <p class="text-zinc-500 text-lg mb-2">No items found</p>
      <p class="text-zinc-600 text-sm">Try adjusting your search or filters</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="item in filteredStock"
        :key="`${item.type}-${item.subtype}`"
        class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 hover:border-blue-500/30 transition-all duration-300 group"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <h3 class="font-semibold text-lg mb-1 group-hover:text-blue-400 transition-colors">
              {{ item.type }}
            </h3>
            <p class="text-sm text-zinc-400">{{ item.subtype }}</p>
          </div>
          <div class="relative">
            <button
              @click="toggleMenu(item)"
              class="w-8 h-8 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 flex items-center justify-center transition-colors"
            >
              <UIcon name="i-heroicons-ellipsis-vertical" class="w-5 h-5 text-zinc-400" />
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="activeMenu === `${item.type}-${item.subtype}`"
              class="absolute right-0 top-10 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-40 z-10"
            >
              <button
                @click="editItem(item)"
                class="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors"
              >
                <UIcon name="i-heroicons-pencil-square" class="w-4 h-4 text-blue-400" />
                Edit
              </button>
              <button
                @click="deleteItem(item)"
                class="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2 transition-colors text-red-400"
              >
                <UIcon name="i-heroicons-trash" class="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Stock Level -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-zinc-500">Stock Level</span>
            <UBadge
              :color="item.quantity === 0 ? 'red' : item.quantity < 5 ? 'orange' : 'green'"
              variant="subtle"
            >
              {{ item.quantity }} units
            </UBadge>
          </div>
          <div class="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              class="h-full transition-all duration-500"
              :class="
                item.quantity === 0
                  ? 'bg-red-500'
                  : item.quantity < 5
                  ? 'bg-orange-500'
                  : 'bg-gradient-to-r from-blue-500 to-green-500'
              "
              :style="{ width: `${Math.min((item.quantity / 20) * 100, 100)}%` }"
            ></div>
          </div>
        </div>

        <!-- Status Badge -->
        <div class="flex items-center gap-2">
          <div
            class="w-2 h-2 rounded-full"
            :class="
              item.quantity === 0
                ? 'bg-red-500'
                : item.quantity < 5
                ? 'bg-orange-500'
                : 'bg-green-500'
            "
          ></div>
          <span class="text-xs text-zinc-500">
            {{ item.quantity === 0 ? 'Out of Stock' : item.quantity < 5 ? 'Low Stock' : 'In Stock' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Add Stock Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showAddModal = false"
    >
      <div
        class="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-xl max-w-md w-full p-6"
        @click.stop
      >
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold">Add New Stock</h2>
          <button @click="showAddModal = false" class="text-zinc-500 hover:text-white">
            <UIcon name="i-heroicons-x-mark" class="w-6 h-6" />
          </button>
        </div>

        <form @submit.prevent="addStock" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Product Type</label>
            <input
              v-model="newStock.productType"
              type="text"
              placeholder="e.g., HAIR EXTENSIONS"
              class="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Product Subtype</label>
            <input
              v-model="newStock.productSubtype"
              type="text"
              placeholder="e.g., BRAZILIAN HAIR"
              class="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Quantity</label>
            <input
              v-model.number="newStock.quantity"
              type="number"
              min="1"
              placeholder="Enter quantity"
              class="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
              required
            />
          </div>

          <div class="flex gap-3 pt-4">
            <button
              type="button"
              @click="showAddModal = false"
              class="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="loading"
              class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              {{ loading ? 'Adding...' : 'Add Stock' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useStockStore } from '@/stores/stockStore'
definePageMeta({
  layout: 'admin',
  // middleware: ['auth']
})
const stockStore = useStockStore()
const toast = useToast()

const searchQuery = ref('')
const filterType = ref('all')
const showAddModal = ref(false)
const activeMenu = ref(null)
const loading = ref(false)

const newStock = ref({
  productType: '',
  productSubtype: '',
  quantity: 1
})

const allStockItems = computed(() => {
  const items = []
  Object.entries(stockStore.stock).forEach(([type, subtypes]) => {
    Object.entries(subtypes).forEach(([subtype, quantity]) => {
      items.push({ type, subtype, quantity })
    })
  })
  return items
})

const filteredStock = computed(() => {
  let items = allStockItems.value

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      item =>
        item.type.toLowerCase().includes(query) ||
        item.subtype.toLowerCase().includes(query)
    )
  }

  // Apply stock level filter
  if (filterType.value === 'low') {
    items = items.filter(item => item.quantity > 0 && item.quantity < 5)
  } else if (filterType.value === 'out') {
    items = items.filter(item => item.quantity === 0)
  }

  return items.sort((a, b) => a.quantity - b.quantity)
})

const toggleMenu = (item) => {
  const key = `${item.type}-${item.subtype}`
  activeMenu.value = activeMenu.value === key ? null : key
}

const editItem = async (item) => {
  activeMenu.value = null
  const quantity = prompt(`Enter new quantity for ${item.type} - ${item.subtype}:`, item.quantity)

  if (quantity !== null) {
    const qty = parseInt(quantity, 10)
    if (!isNaN(qty) && qty >= 0) {
      try {
        await stockStore.editStock(item.type, item.subtype, qty)
        toast.add({
          title: 'Stock Updated',
          color: 'green',
          icon: 'i-heroicons-check-circle'
        })
      } catch (error) {
        toast.add({
          title: 'Update Failed',
          color: 'red',
          icon: 'i-heroicons-x-circle'
        })
      }
    }
  }
}

const deleteItem = async (item) => {
  activeMenu.value = null
  const confirmed = confirm(`Delete ${item.type} - ${item.subtype}?`)

  if (confirmed) {
    try {
      await stockStore.deleteStock(item.type, item.subtype)
      toast.add({
        title: 'Item Deleted',
        color: 'green',
        icon: 'i-heroicons-check-circle'
      })
    } catch (error) {
      toast.add({
        title: 'Delete Failed',
        color: 'red',
        icon: 'i-heroicons-x-circle'
      })
    }
  }
}

const addStock = async () => {
  loading.value = true

  try {
    const sanitized = {
      productType: newStock.value.productType.trim().toUpperCase(),
      productSubtype: newStock.value.productSubtype.trim().toUpperCase(),
      quantity: newStock.value.quantity
    }

    await stockStore.addStock(sanitized.productType, sanitized.productSubtype, sanitized.quantity)

    toast.add({
      title: 'Stock Added',
      description: `Added ${sanitized.quantity} units`,
      color: 'green',
      icon: 'i-heroicons-check-circle'
    })

    showAddModal.value = false
    newStock.value = { productType: '', productSubtype: '', quantity: 1 }
  } catch (error) {
    toast.add({
      title: 'Failed to Add Stock',
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  } finally {
    loading.value = false
  }
}

// Close menu when clicking outside
onMounted(() => {
  document.addEventListener('click', () => {
    activeMenu.value = null
  })

  stockStore.initSocket()
})

onUnmounted(() => {
  stockStore.disconnectSocket()
})
</script>
