import { create } from 'zustand'

/**
 * Digital Creator Studio System
 *
 * Tyler Perry-style digital media creation platform
 * - Users create and produce content (movies, shows, music, etc)
 * - Monetization with custom pricing
 * - Stage setup and performance
 * - Subscription packages with different tiers
 * - Professional recording studios
 */

export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Free Account',
    credits: 10000,
    price: 0,
    duration: 'indefinite',
    emoji: '🎬',
    includes: [
      'Basic studio access',
      'Limited recording time',
      'Standard quality',
      '10,000 credits'
    ]
  },
  day_pass: {
    id: 'day_pass',
    name: '24-Hour Pass',
    credits: 50000,
    price: 9900, // $99
    duration: '24 hours',
    emoji: '📹',
    includes: [
      'Full studio access for 24 hours',
      'Professional quality recording',
      'Unlimited recording time',
      'Stage access',
      '50,000 credits',
      'House & Car'
    ]
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly Pack',
    credits: 50000,
    price: 29900, // $299
    duration: '7 days',
    emoji: '🎪',
    includes: [
      'Full studio access all week',
      'Professional quality recording',
      'Priority stage booking',
      'Multiple sets available',
      '50,000 credits',
      'House & Car',
      'Basic monetization setup'
    ]
  },
  biweekly: {
    id: 'biweekly',
    name: 'Bi-Weekly Pack',
    credits: 50000,
    price: 49900, // $499
    duration: '14 days',
    emoji: '🎭',
    includes: [
      'Full studio access (2 weeks)',
      '4K quality recording',
      'VIP stage access',
      'Multiple sets & stages',
      '50,000 credits',
      'House & Car',
      'Advanced monetization',
      'Audience analytics',
      'Content distribution'
    ]
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Pack',
    credits: 50000,
    price: 99900, // $999
    duration: '30 days',
    emoji: '🎬',
    includes: [
      'Unlimited studio access',
      '8K quality recording',
      'Premium stage access',
      'All sets & stages',
      '50,000 credits',
      'House & Car',
      'Full monetization suite',
      'Advanced analytics',
      'Custom branding',
      'Revenue sharing',
      'Priority support'
    ]
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Pack',
    credits: 50000,
    price: 999900, // $9,999
    duration: '365 days',
    emoji: '🏆',
    includes: [
      'Unlimited annual access',
      'Platinum quality (12K)',
      'All studios & stages',
      'Premium house & car',
      '50,000 credits',
      'Full monetization suite',
      'White-glove support',
      'Revenue guarantee',
      'Custom sets built',
      'Marketing assistance',
      'Direct audience access',
      'Yearly bonus credits'
    ]
  }
}

export const STUDIO_TYPES = {
  broadcast_studio: {
    id: 'broadcast_studio',
    name: 'Broadcast Studio',
    description: 'Professional TV/streaming production',
    cameras: 4,
    microphones: 8,
    lighting: 'Professional LED',
    soundStage: '10,000 sq ft',
    features: ['Green screen', 'Multiple set designs', '4K cameras'],
    dailyRate: 5000 // credits
  },
  intimate_studio: {
    id: 'intimate_studio',
    name: 'Intimate Studio',
    description: 'Talk shows, interviews, podcasts',
    cameras: 2,
    microphones: 4,
    lighting: 'Studio LED',
    soundStage: '2,000 sq ft',
    features: ['Comfortable seating', 'Professional audio', 'Backdrop options'],
    dailyRate: 2000
  },
  performance_stage: {
    id: 'performance_stage',
    name: 'Performance Stage',
    description: 'Music, concerts, live performances',
    cameras: 6,
    microphones: 12,
    lighting: 'Concert lighting',
    soundStage: '15,000 sq ft',
    features: ['Live band setup', 'Concert acoustics', 'Audience seating'],
    dailyRate: 8000
  },
  film_studio: {
    id: 'film_studio',
    name: 'Film Studio',
    description: 'Full feature film production',
    cameras: 8,
    microphones: 20,
    lighting: 'Hollywood standard',
    soundStage: '25,000 sq ft',
    features: ['Multiple sets', 'Prop storage', 'Professional crew'],
    dailyRate: 15000
  },
  podcast_booth: {
    id: 'podcast_booth',
    name: 'Podcast Booth',
    description: 'Solo podcasting & voice work',
    cameras: 1,
    microphones: 2,
    lighting: 'Basic LED',
    soundStage: '200 sq ft',
    features: ['Quiet isolation', 'Professional audio', 'Simple setup'],
    dailyRate: 500
  }
}

export const CONTENT_TYPES = {
  movie: { name: 'Feature Film', duration: '90-180 min', credits: 50000 },
  series: { name: 'TV Series', duration: '45-60 min per episode', credits: 30000 },
  concert: { name: 'Concert/Live Show', duration: '60-180 min', credits: 20000 },
  podcast: { name: 'Podcast Episode', duration: '30-120 min', credits: 5000 },
  interview: { name: 'Interview', duration: '30-90 min', credits: 10000 },
  music_video: { name: 'Music Video', duration: '3-10 min', credits: 15000 },
  documentary: { name: 'Documentary', duration: '60-240 min', credits: 40000 },
  comedy_special: { name: 'Comedy Special', duration: '60-90 min', credits: 25000 },
  talk_show: { name: 'Talk Show', duration: '60 min', credits: 12000 },
  vlog: { name: 'Video Blog', duration: '5-30 min', credits: 2000 }
}

export const useCreatorStudioSystem = create((set, get) => ({
  // Creator profiles
  creatorProfiles: {}, // creatorId -> profile data

  // Subscription management
  activeSubscriptions: {}, // creatorId -> subscription data

  // Content library
  createdContent: {}, // contentId -> content data

  // Studio bookings
  studioBookings: {}, // bookingId -> booking data

  // Monetization
  creatorEarnings: {}, // creatorId -> earnings data

  // ===== SUBSCRIPTION MANAGEMENT =====
  subscribeTier: (creatorId, tierId) => {
    const tier = SUBSCRIPTION_TIERS[tierId]
    if (!tier) return false

    const subscriptionId = `sub_${creatorId}_${tierId}_${Date.now()}`

    set(state => {
      // Calculate expiration
      let expirationDate = new Date()
      if (tier.duration === '24 hours') expirationDate.setHours(expirationDate.getHours() + 24)
      if (tier.duration === '7 days') expirationDate.setDate(expirationDate.getDate() + 7)
      if (tier.duration === '14 days') expirationDate.setDate(expirationDate.getDate() + 14)
      if (tier.duration === '30 days') expirationDate.setMonth(expirationDate.getMonth() + 1)
      if (tier.duration === '365 days') expirationDate.setFullYear(expirationDate.getFullYear() + 1)

      return {
        activeSubscriptions: {
          ...state.activeSubscriptions,
          [creatorId]: {
            subscriptionId,
            creatorId,
            tierId,
            tierName: tier.name,
            startDate: new Date(),
            expirationDate,
            credits: tier.credits,
            creditsRemaining: tier.credits,
            price: tier.price,
            studioAccess: tier.includes,
            isActive: true
          }
        },
        creatorProfiles: {
          ...state.creatorProfiles,
          [creatorId]: state.creatorProfiles[creatorId] ? {
            ...state.creatorProfiles[creatorId],
            currentSubscription: tierId,
            subscriptionDate: new Date()
          } : {
            creatorId,
            name: `Creator_${creatorId}`,
            currentSubscription: tierId,
            subscriptionDate: new Date(),
            studioBookings: [],
            contentCreated: 0,
            followers: 0,
            earnings: 0
          }
        }
      }
    })

    return subscriptionId
  },

  // Get active subscription
  getActiveSubscription: (creatorId) => {
    const sub = get().activeSubscriptions[creatorId]
    if (!sub || sub.expirationDate < new Date()) {
      return null
    }
    return sub
  },

  // Upgrade/change subscription
  upgradeTier: (creatorId, newTierId) => {
    const currentSub = get().activeSubscriptions[creatorId]
    if (currentSub) {
      // End current subscription
      set(state => ({
        activeSubscriptions: {
          ...state.activeSubscriptions,
          [creatorId]: {
            ...state.activeSubscriptions[creatorId],
            isActive: false
          }
        }
      }))
    }

    // Start new subscription
    return get().subscribeTier(creatorId, newTierId)
  },

  // ===== STUDIO BOOKING =====
  bookStudio: (creatorId, studioId, date, hours = 8) => {
    const studio = Object.values(STUDIO_TYPES).find(s => s.id === studioId)
    const sub = get().getActiveSubscription(creatorId)

    if (!studio || !sub) return false

    const creditsCost = studio.dailyRate * (hours / 24)
    if (sub.creditsRemaining < creditsCost) return false

    const bookingId = `booking_${creatorId}_${studioId}_${Date.now()}`

    set(state => ({
      studioBookings: {
        ...state.studioBookings,
        [bookingId]: {
          bookingId,
          creatorId,
          studioId,
          studioName: studio.name,
          date,
          hours,
          creditsCost,
          status: 'confirmed',
          bookedAt: new Date()
        }
      },
      activeSubscriptions: {
        ...state.activeSubscriptions,
        [creatorId]: {
          ...state.activeSubscriptions[creatorId],
          creditsRemaining: sub.creditsRemaining - creditsCost
        }
      }
    }))

    return bookingId
  },

  cancelBooking: (bookingId) => {
    set(state => {
      const booking = state.studioBookings[bookingId]
      if (!booking) return state

      return {
        studioBookings: {
          ...state.studioBookings,
          [bookingId]: {
            ...booking,
            status: 'cancelled',
            cancelledAt: new Date()
          }
        },
        activeSubscriptions: {
          ...state.activeSubscriptions,
          [booking.creatorId]: {
            ...state.activeSubscriptions[booking.creatorId],
            creditsRemaining: state.activeSubscriptions[booking.creatorId].creditsRemaining + booking.creditsCost
          }
        }
      }
    })
  },

  // ===== CONTENT CREATION =====
  createContent: (creatorId, contentType, title, description, price = 0) => {
    const type = CONTENT_TYPES[contentType]
    if (!type) return false

    const contentId = `content_${creatorId}_${contentType}_${Date.now()}`

    set(state => ({
      createdContent: {
        ...state.createdContent,
        [contentId]: {
          contentId,
          creatorId,
          type: contentType,
          title,
          description,
          price, // custom price in credits
          views: 0,
          likes: 0,
          revenue: 0,
          createdAt: new Date(),
          published: false,
          ratings: []
        }
      },
      creatorProfiles: {
        ...state.creatorProfiles,
        [creatorId]: {
          ...state.creatorProfiles[creatorId],
          contentCreated: (state.creatorProfiles[creatorId]?.contentCreated || 0) + 1
        }
      }
    }))

    return contentId
  },

  // Publish content
  publishContent: (contentId, monetizationType = 'free') => {
    set(state => {
      const content = state.createdContent[contentId]
      if (!content) return state

      return {
        createdContent: {
          ...state.createdContent,
          [contentId]: {
            ...content,
            published: true,
            monetizationType, // free, paid, subscription
            publishedAt: new Date()
          }
        }
      }
    })
  },

  // Watch content & generate revenue
  watchContent: (contentId, watcherCredits) => {
    set(state => {
      const content = state.createdContent[contentId]
      if (!content) return state

      const revenueShare = Math.round(content.price * 0.7) // Creator gets 70%

      return {
        createdContent: {
          ...state.createdContent,
          [contentId]: {
            ...content,
            views: content.views + 1,
            revenue: content.revenue + revenueShare
          }
        },
        creatorEarnings: {
          ...state.creatorEarnings,
          [content.creatorId]: {
            ...state.creatorEarnings[content.creatorId],
            totalEarnings: (state.creatorEarnings[content.creatorId]?.totalEarnings || 0) + revenueShare,
            viewsGenerated: (state.creatorEarnings[content.creatorId]?.viewsGenerated || 0) + 1
          }
        }
      }
    })
  },

  // Rate content
  rateContent: (contentId, rating, review) => {
    set(state => {
      const content = state.createdContent[contentId]
      if (!content) return state

      return {
        createdContent: {
          ...state.createdContent,
          [contentId]: {
            ...content,
            ratings: [
              ...content.ratings,
              { rating, review, date: new Date() }
            ]
          }
        }
      }
    })
  },

  // ===== MONETIZATION SETTINGS =====
  setContentPrice: (contentId, priceInCredits) => {
    set(state => {
      const content = state.createdContent[contentId]
      if (!content) return state

      return {
        createdContent: {
          ...state.createdContent,
          [contentId]: {
            ...content,
            price: priceInCredits
          }
        }
      }
    })
  },

  // Enable monetization
  enableMonetization: (creatorId) => {
    set(state => ({
      creatorProfiles: {
        ...state.creatorProfiles,
        [creatorId]: {
          ...state.creatorProfiles[creatorId],
          monetizationEnabled: true,
          monetizationDate: new Date()
        }
      }
    }))
  },

  // Withdraw earnings
  withdrawEarnings: (creatorId, amount) => {
    set(state => {
      const earnings = state.creatorEarnings[creatorId]
      if (!earnings || earnings.totalEarnings < amount) return state

      return {
        creatorEarnings: {
          ...state.creatorEarnings,
          [creatorId]: {
            ...earnings,
            totalEarnings: earnings.totalEarnings - amount,
            withdrawn: (earnings.withdrawn || 0) + amount,
            withdrawals: [
              ...(earnings.withdrawals || []),
              { amount, date: new Date() }
            ]
          }
        },
        creatorProfiles: {
          ...state.creatorProfiles,
          [creatorId]: {
            ...state.creatorProfiles[creatorId],
            balance: (state.creatorProfiles[creatorId]?.balance || 0) + amount
          }
        }
      }
    })
  },

  // ===== CREATOR STATISTICS =====
  getCreatorStats: (creatorId) => {
    const profile = get().creatorProfiles[creatorId]
    const earnings = get().creatorEarnings[creatorId]
    const content = Object.values(get().createdContent).filter(c => c.creatorId === creatorId)
    const bookings = Object.values(get().studioBookings).filter(b => b.creatorId === creatorId && b.status === 'confirmed')

    const totalViews = content.reduce((sum, c) => sum + c.views, 0)
    const totalRevenue = earnings?.totalEarnings || 0
    const avgRating = content.length > 0
      ? content.reduce((sum, c) => {
          const avgCRating = c.ratings.length > 0
            ? c.ratings.reduce((s, r) => s + r.rating, 0) / c.ratings.length
            : 0
          return sum + avgCRating
        }, 0) / content.length
      : 0

    return {
      creatorName: profile?.name,
      subscription: profile?.currentSubscription,
      contentCreated: content.length,
      totalViews,
      totalRevenue,
      avgRating: parseFloat(avgRating.toFixed(2)),
      activeBookings: bookings.length,
      followers: profile?.followers || 0,
      balance: profile?.balance || 0,
      monetizationEnabled: profile?.monetizationEnabled || false
    }
  },

  getCreatorContent: (creatorId) => {
    return Object.values(get().createdContent).filter(c => c.creatorId === creatorId)
  },

  getCreatorEarnings: (creatorId) => {
    return get().creatorEarnings[creatorId]
  },

  // ===== FEATURED CREATORS =====
  getFeaturedCreators: () => {
    const allEarnings = get().creatorEarnings
    return Object.entries(allEarnings)
      .sort(([, a], [, b]) => b.totalEarnings - a.totalEarnings)
      .slice(0, 10)
      .map(([creatorId, earning]) => ({
        creatorId,
        earnings: earning.totalEarnings,
        views: earning.viewsGenerated
      }))
  },

  // ===== HOUSE & CAR ASSIGNMENT =====
  assignHouseAndCar: (creatorId, subscriptionTier) => {
    set(state => ({
      creatorProfiles: {
        ...state.creatorProfiles,
        [creatorId]: {
          ...state.creatorProfiles[creatorId],
          house: {
            type: `Studio House - ${subscriptionTier}`,
            location: { x: Math.random() * 1000, y: 0, z: Math.random() * 1000 },
            rooms: 8,
            furnishings: 'Professional'
          },
          car: {
            type: `Studio Car - ${subscriptionTier}`,
            color: ['Black', 'White', 'Silver'][Math.floor(Math.random() * 3)],
            quality: subscriptionTier
          }
        }
      }
    }))
  }
}))
