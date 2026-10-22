/**
 * VISION STORMS WORLD - Mailing & Merchandise Service
 *
 * Players can send physical gifts to friends
 * - Privacy-protected (no address exposure)
 * - Trinity provides mailing service
 * - Shop integration (select items, ship to recipient)
 * - Merchandise fulfillment
 *
 * Trinity/Platform takes percentage of each transaction
 */

import { create } from 'zustand'

export const useMailingService = create((set, get) => ({
  // ===== MERCHANDISE CATALOG =====
  merchandise: {
    apparel: {
      category: 'Apparel',
      items: [
        {
          id: 'tshirt_vision',
          name: 'Vision Storms Classic T-Shirt',
          description: 'Premium cotton tee with Vision Storms logo',
          sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
          colors: ['black', 'white', 'navy'],
          price: 1999, // $19.99
          image: '/merch/tshirt_vision.jpg'
        },
        {
          id: 'hoodie_trinity',
          name: 'Trinity Reign Hoodie',
          description: 'Comfortable hoodie with Trinity branding',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['black', 'navy', 'gray'],
          price: 4999, // $49.99
          image: '/merch/hoodie_trinity.jpg'
        },
        {
          id: 'hat_vision',
          name: 'Vision Storms Logo Hat',
          description: 'Adjustable baseball cap',
          colors: ['black', 'white', 'navy'],
          price: 1499, // $14.99
          image: '/merch/hat_vision.jpg'
        }
      ]
    },
    accessories: {
      category: 'Accessories',
      items: [
        {
          id: 'mug_vision',
          name: 'Vision Storms Coffee Mug',
          description: 'Ceramic mug with inspirational message',
          price: 999, // $9.99
          image: '/merch/mug_vision.jpg'
        },
        {
          id: 'water_bottle',
          name: 'Vision Storms Water Bottle',
          description: 'Insulated water bottle, keeps drinks cold 24hrs',
          colors: ['black', 'white', 'blue'],
          price: 1999, // $19.99
          image: '/merch/bottle_vision.jpg'
        },
        {
          id: 'sticker_pack',
          name: 'Vision Storms Sticker Pack',
          description: '20 high-quality stickers',
          price: 499, // $4.99
          image: '/merch/stickers_vision.jpg'
        }
      ]
    },
    music: {
      category: 'Music & Media',
      items: [
        {
          id: 'vinyl_trinity',
          name: 'Trinity Reign Vinyl Album',
          description: 'Limited edition vinyl record (if available)',
          price: 2499, // $24.99
          image: '/merch/vinyl_trinity.jpg'
        },
        {
          id: 'cd_collection',
          name: 'Trinity Collection CD',
          description: 'Best of Trinity Reign collection',
          price: 999, // $9.99
          image: '/merch/cd_trinity.jpg'
        }
      ]
    }
  },

  // ===== MAILING ADDRESSES (Private/Secure Storage) =====
  mailingAddresses: {}, // playerId -> { hashed_id, displayName, is_default }
  addressVerification: {}, // Secure address verification

  // ===== GIFT ORDERS =====
  giftOrders: {}, // orderId -> order data
  orderHistory: [],

  // ===== REGISTER MAILING ADDRESS =====
  registerMailingAddress: (playerId, addressData) => {
    // addressData = {
    //   fullName, street, city, state, zipCode, country
    // }

    // IMPORTANT: Address is HASHED - never stored in plain text
    // Player gets a displayName instead
    const addressHash = hashAddress(addressData)
    const addressId = `addr_${Date.now()}`

    // In real implementation: Verify address with USPS API
    const verification = {
      addressId: addressId,
      playerId: playerId,
      addressHash: addressHash,
      displayName: `${addressData.city}, ${addressData.state}`,
      isVerified: true, // Would verify with USPS
      createdAt: Date.now()
    }

    set(state => ({
      addressVerification: {
        ...state.addressVerification,
        [addressId]: verification
      }
    }))

    return {
      success: true,
      addressId: addressId,
      displayName: verification.displayName,
      message: 'Address registered securely. Your address is never shown to gift senders.',
      privacy_note: 'Only Vision Storms has access to your full address for mailing purposes.'
    }
  },

  // ===== SEND GIFT =====
  sendGift: (senderPlayerId, recipientPlayerId, itemId, itemDetails, personalMessage = '') => {
    // Find item in catalog
    let item = null
    Object.values(get().merchandise).forEach(category => {
      const found = category.items.find(i => i.id === itemId)
      if (found) {
        item = { ...found, ...itemDetails } // Apply size/color selections
      }
    })

    if (!item) return { success: false, error: 'Item not found' }

    // Get recipient's default mailing address
    const recipientAddress = get().mailingAddresses[recipientPlayerId]
    if (!recipientAddress) {
      return { success: false, error: 'Recipient must register mailing address first' }
    }

    const orderId = `order_${Date.now()}`

    // Calculate costs
    const itemPrice = item.price
    const shippingCost = 599 // $5.99 flat rate
    const platformFee = Math.floor(itemPrice * 0.15) // 15% platform fee
    const totalCost = itemPrice + shippingCost + platformFee

    const giftOrder = {
      id: orderId,
      senderPlayerId: senderPlayerId,
      recipientPlayerId: recipientPlayerId,
      itemId: itemId,
      itemName: item.name,
      size: itemDetails.size || null,
      color: itemDetails.color || null,
      personalMessage: personalMessage,
      itemPrice: itemPrice,
      shippingCost: shippingCost,
      platformFee: platformFee,
      totalCost: totalCost,
      status: 'processing', // processing -> packed -> shipped -> delivered
      shippingAddress_hash: recipientAddress.addressHash,
      trackingNumber: null,
      estimatedDelivery: null,
      createdAt: Date.now(),
      shippedAt: null,
      deliveredAt: null
    }

    set(state => ({
      giftOrders: {
        ...state.giftOrders,
        [orderId]: giftOrder
      },
      orderHistory: [...state.orderHistory, giftOrder]
    }))

    return {
      success: true,
      orderId: orderId,
      itemName: item.name,
      totalCost: totalCost,
      breakdown: {
        itemPrice: itemPrice,
        shipping: shippingCost,
        platformFee: platformFee
      },
      estimatedDelivery: '5-7 business days',
      message: `Gift ordered! ${item.name} will be shipped to your friend's address securely.`,
      privacyNote: 'Recipient\'s address is private - sender never sees it.'
    }
  },

  // ===== PACK & SHIP ORDER (Admin/Fulfillment) =====
  packAndShip: (orderId) => {
    const order = get().giftOrders[orderId]
    if (!order) return { success: false }

    if (order.status !== 'processing') {
      return { success: false, error: 'Order already shipped' }
    }

    const trackingNumber = generateTrackingNumber()
    const shippedDate = Date.now()
    const estimatedDelivery = new Date(shippedDate + (7 * 24 * 60 * 60 * 1000))

    set(state => ({
      giftOrders: {
        ...state.giftOrders,
        [orderId]: {
          ...order,
          status: 'shipped',
          trackingNumber: trackingNumber,
          shippedAt: shippedDate,
          estimatedDelivery: estimatedDelivery
        }
      }
    }))

    // Notify both players
    return {
      success: true,
      trackingNumber: trackingNumber,
      shippedDate: new Date(shippedDate).toLocaleDateString(),
      estimatedDelivery: estimatedDelivery.toLocaleDateString()
    }
  },

  // ===== DELIVERY CONFIRMATION =====
  markDelivered: (orderId) => {
    const order = get().giftOrders[orderId]
    if (!order) return { success: false }

    set(state => ({
      giftOrders: {
        ...state.giftOrders,
        [orderId]: {
          ...order,
          status: 'delivered',
          deliveredAt: Date.now()
        }
      }
    }))

    return {
      success: true,
      message: 'Gift delivered! Recipient can now rate and review their gift.'
    }
  },

  // ===== SHOP INTERFACE =====
  browseMerchandise: (category = null) => {
    if (category) {
      return get().merchandise[category]?.items || []
    }

    // Return all items
    let allItems = []
    Object.values(get().merchandise).forEach(cat => {
      allItems = allItems.concat(cat.items)
    })

    return allItems
  },

  // ===== GIFT HISTORY =====
  getGiftsSent: (playerId) => {
    return Object.values(get().giftOrders).filter(o => o.senderPlayerId === playerId)
  },

  getGiftsReceived: (playerId) => {
    return Object.values(get().giftOrders).filter(o => o.recipientPlayerId === playerId)
  },

  // ===== REVENUE TRACKING =====
  getMailingServiceRevenue: () => {
    const orders = Object.values(get().giftOrders).filter(
      o => o.status === 'delivered'
    )

    const totalRevenue = orders.reduce((sum, o) => sum + o.platformFee, 0)

    return {
      totalOrdersCompleted: orders.length,
      totalRevenue: totalRevenue,
      averageOrderValue: orders.length > 0
        ? Math.floor(orders.reduce((sum, o) => sum + o.totalCost, 0) / orders.length)
        : 0,
      revenueBreakdown: {
        platform_fee: totalRevenue,
        shipping_costs_covered: orders.reduce((sum, o) => sum + o.shippingCost, 0)
      }
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function hashAddress(addressData) {
  // In real implementation: SHA-256 hash
  // For demo: Simple hash
  const str = `${addressData.street}${addressData.city}${addressData.state}${addressData.zipCode}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}

function generateTrackingNumber() {
  return `VISION-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

export function getMerchandiseCategories() {
  return Object.keys(useMailingService.getState().merchandise)
}

export function getGiftOrderStatus(orderId) {
  const order = useMailingService.getState().giftOrders[orderId]
  return order || null
}
