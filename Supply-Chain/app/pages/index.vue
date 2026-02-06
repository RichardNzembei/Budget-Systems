<template>
  <div class="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
    <!-- Background Effects -->
    <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/5"></div>
    <div class="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
    <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>

    <div class="w-full max-w-md px-4 relative z-10">
      <!-- Logo/Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/30 mb-4">
          <UIcon name="i-heroicons-lock-closed" class="w-8 h-8 text-blue-400" />
        </div>
        <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
        <p class="text-zinc-500">Sign in to access your inventory</p>
      </div>

      <!-- Login Card -->
      <div class="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Username -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-white">Username</label>
            <div class="relative">
              <UIcon
                name="i-heroicons-user"
                class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
              />
              <input
                v-model="credentials.username"
                type="text"
                placeholder="Enter your username"
                class="w-full bg-black border rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none transition-all"
                :class="errors.username ? 'border-red-500/50' : 'border-zinc-800 focus:border-blue-500/50'"
                :disabled="loading"
                @input="errors.username = ''"
              />
            </div>
            <p v-if="errors.username" class="text-sm text-red-400">{{ errors.username }}</p>
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-white">Password</label>
            <div class="relative">
              <UIcon
                name="i-heroicons-lock-closed"
                class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
              />
              <input
                v-model="credentials.password"
                type="password"
                placeholder="Enter your password"
                class="w-full bg-black border rounded-lg pl-12 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none transition-all"
                :class="errors.password ? 'border-red-500/50' : 'border-zinc-800 focus:border-blue-500/50'"
                :disabled="loading"
                @input="errors.password = ''"
              />
            </div>
            <p v-if="errors.password" class="text-sm text-red-400">{{ errors.password }}</p>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between pt-2">
            <label class="flex items-center gap-2 cursor-pointer group">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 rounded border-zinc-800 bg-black text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0 focus:ring-2 cursor-pointer"
              />
              <span class="text-sm text-zinc-400 group-hover:text-white transition-colors">Remember me</span>
            </label>
            <button
              type="button"
              class="text-sm text-zinc-500 hover:text-blue-400 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <!-- Sign In Button -->
          <button
            type="submit"
            :disabled="loading || !credentials.username || !credentials.password"
            class="w-full py-3.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black mt-6"
          >
            <span v-if="!loading" class="flex items-center justify-center gap-2">
              <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-5 h-5" />
              Sign In
            </span>
            <span v-else class="flex items-center justify-center gap-2">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
              Signing in...
            </span>
          </button>
        </form>
      </div>
      <p class="text-center text-xs text-zinc-600 mt-6">
        Secure inventory management system
      </p>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false,
})

const toast = useToast()

const credentials = ref({
  username: '',
  password: ''
})

const errors = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const rememberMe = ref(false)

const users = {
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Administrator'
  },
  worker: {
    username: 'worker',
    password: 'worker123',
    role: 'worker',
    name: 'Worker'
  }
}

const handleLogin = async () => {
  errors.value = {
    username: '',
    password: ''
  }

  if (!credentials.value.username) {
    errors.value.username = 'Username is required'
    return
  }

  if (!credentials.value.password) {
    errors.value.password = 'Password is required'
    return
  }

  loading.value = true
  await new Promise(resolve => setTimeout(resolve, 1000))

  const user = users[credentials.value.username.toLowerCase()]

  if (!user || user.password !== credentials.value.password) {
    toast.add({
      title: 'Login Failed',
      description: 'Invalid username or password',
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })

    errors.value.username = 'Invalid credentials'
    loading.value = false
    return
  }

  const userData = {
    username: user.username,
    role: user.role,
    name: user.name
  }

  localStorage.setItem('user', JSON.stringify(userData))
  if (rememberMe.value) {
    localStorage.setItem('rememberMe', 'true')
  }

  toast.add({
    title: 'Welcome back!',
    description: `Logged in as ${user.name}`,
    color: 'green',
    icon: 'i-heroicons-check-circle'
  })

  loading.value = false

  if (user.role === 'admin') {
    await navigateTo('/admin/dashboard')
  } else {
    await navigateTo('/worker/orders')
  }
}

onMounted(() => {
  const user = localStorage.getItem('user')
  if (user) {
    const userData = JSON.parse(user)
    if (userData.role === 'admin') {
      navigateTo('/admin/dashboard')
    } else {
      navigateTo('/admin/dashboard')
    }
  }
})
</script>
