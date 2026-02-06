<template>
  <div class="min-h-screen bg-black text-white">
    <aside class="hidden lg:fixed lg:flex lg:flex-col lg:w-64 lg:h-screen bg-zinc-950 border-r border-zinc-800 z-40">
      <div class="p-6 border-b border-zinc-800">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <UIcon name="i-heroicons-cube" class="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 class="text-lg font-bold">Inventory</h1>
            <p class="text-xs text-zinc-500">Management</p>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-4 space-y-1">
        <NuxtLink
          v-for="link in adminNavLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
          :class="isActive(link.to) ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'"
        >
          <UIcon :name="link.icon" class="w-5 h-5" />
          <span class="font-medium">{{ link.label }}</span>
        </NuxtLink>
      </nav>
      <div class="p-4 border-t border-zinc-800">
        <div class="px-4 py-3 bg-zinc-900 rounded-lg">
          <p class="text-xs text-zinc-500">Logged in as</p>
          <p class="text-sm font-medium text-blue-400">Administrator</p>
        </div>
      </div>
    </aside>
    <div class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950 border-t border-zinc-800">
      <nav class="flex justify-around h-16">
        <NuxtLink
          v-for="link in adminNavLinks"
          :key="link.to"
          :to="link.to"
          class="flex flex-col items-center justify-center flex-1"
          :class="isActive(link.to) ? 'text-blue-400' : 'text-zinc-500'"
        >
          <UIcon :name="link.icon" class="w-6 h-6 mb-1" />
          <span class="text-xs">{{ link.label }}</span>
        </NuxtLink>
      </nav>
    </div>
    <main class="lg:ml-64 pb-20 lg:pb-0 bg-black">
      <pop-up-notification />
      <NuxtPage />
    </main>
    <UNotifications />
  </div>
</template>
<script setup>
const route = useRoute()
const adminNavLinks = [
  { label: 'Dashboard', icon: 'i-heroicons-home', to: '/admin/dashboard' },
  { label: 'Stock',     icon: 'i-heroicons-cube', to: '/admin/add-stock' },
  { label: 'Orders',     icon: 'i-heroicons-cube', to: '/admin/orders' },
  { label: 'Create Order',    icon: 'i-heroicons-shopping-cart', to: '/admin/create-order' },
  { label: 'Reports',   icon: 'i-heroicons-chart-bar', to: '/admin/records' }
]
const isActive = (path) => route.path === path
</script>
