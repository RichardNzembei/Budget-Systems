<template>
  <!-- Notification prompt using Nuxt UI Toast -->
  <UNotifications />
</template>

<script setup>
import { useNotificationStore } from '@/stores/notification'

const notificationStore = useNotificationStore()
const toast = useToast()

const isSubscribed = ref(false)
const hasPrompted = ref(false)

const showSubscriptionPrompt = () => {
  // Don't show if already subscribed or already prompted
  if (hasPrompted.value || isSubscribed.value) return

  hasPrompted.value = true

  // Show persistent notification with actions
  toast.add({
    id: 'subscription-prompt',
    title: 'Notifications Disabled',
    description: 'Enable system notifications to receive important updates about your inventory.',
    color: 'amber',
    icon: 'i-heroicons-bell-alert',
    timeout: 0, // Don't auto-dismiss
    actions: [
      {
        label: 'Enable Notifications',
        color: 'primary',
        click: async () => {
          await subscribe()
          toast.remove('subscription-prompt')
        }
      },
      {
        label: 'Remind Me Later',
        color: 'gray',
        variant: 'ghost',
        click: () => {
          toast.remove('subscription-prompt')
          // User can be reminded again on next visit
          hasPrompted.value = false
        }
      }
    ]
  })
}

const subscribe = async () => {
  try {
    console.log('Attempting to subscribe for notifications...')
    await notificationStore.subscribeUser()

    isSubscribed.value = !!notificationStore.subscription

    if (isSubscribed.value) {
      console.log('Subscription successful.')
      localStorage.setItem('isSubscribed', 'true')

      toast.add({
        title: 'Notifications Enabled',
        description: 'You will now receive important updates about your inventory',
        color: 'green',
        icon: 'i-heroicons-check-circle'
      })
    } else {
      console.log('Subscription failed.')
      throw new Error('Subscription failed')
    }
  } catch (error) {
    console.error('Error subscribing to notifications:', error)
    toast.add({
      title: 'Failed to Enable Notifications',
      description: 'Please try again or check your browser settings',
      color: 'red',
      icon: 'i-heroicons-x-circle'
    })
  }
}

onMounted(() => {
  // Check if user has previously subscribed
  const subscriptionStatus = localStorage.getItem('isSubscribed')
  const previouslySubscribed = subscriptionStatus === 'true'

  // Also check the store subscription
  isSubscribed.value = previouslySubscribed || !!notificationStore.subscription

  console.log(`Subscription status on mount: ${isSubscribed.value ? 'Subscribed' : 'Not Subscribed'}`)

  // Show prompt after 2 seconds if not subscribed
  if (!isSubscribed.value) {
    setTimeout(() => {
      showSubscriptionPrompt()
    }, 2000)
  }
})
</script>
