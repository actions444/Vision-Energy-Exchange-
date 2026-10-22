/**
 * VISION STORMS WORLD - Creator Content Platform
 *
 * Players can:
 * - Create content in filming rooms
 * - Produce films/concerts/documentaries
 * - Monetize through movie theaters
 * - Revenue split: 45% Trinity Reign (platform), 55% Creator
 *
 * Integrated with Vision Storms World economy
 */

import { create } from 'zustand'

export const useCreatorContentPlatform = create((set, get) => ({
  // ===== FILMING STUDIOS =====
  studios: {
    main_studio: {
      id: 'studio_main',
      name: 'Vision Storms Media Studio',
      location: { x: 100, y: 0, z: 100 },
      capacity: 50, // people
      equipment: [
        'Professional cameras (4K, 8K)',
        'Lighting rigs',
        'Sound stage',
        'Green screen',
        'Audio mixing console',
        'Editing bays',
        'Live streaming setup'
      ],
      hourlyRate: 50, // Credits per hour
      available: true
    },
    concert_studio: {
      id: 'studio_concert',
      name: 'Trinity Reign Concert Hall',
      location: { x: 200, y: 0, z: 150 },
      capacity: 1000,
      equipment: [
        'Concert stage',
        'Professional sound system',
        'Lighting rig',
        'Recording equipment',
        'Live streaming',
        'Green screen backdrop'
      ],
      hourlyRate: 100,
      available: true
    }
  },

  // ===== CONTENT TYPES =====
  contentTypes: {
    music_video: {
      id: 'music_video',
      name: 'Music Video',
      minDuration: '3:00', // Minutes
      maxDuration: '10:00',
      defaultPrice: 2.99, // Creator sets price
      requiresStudio: true
    },
    documentary: {
      id: 'documentary',
      name: 'Documentary',
      minDuration: '15:00',
      maxDuration: '180:00',
      defaultPrice: 4.99,
      requiresStudio: true
    },
    concert_film: {
      id: 'concert_film',
      name: 'Concert Film',
      minDuration: '60:00',
      maxDuration: '240:00',
      defaultPrice: 9.99,
      requiresStudio: true,
      specialRequirements: ['Concert Hall', 'Live Audience']
    },
    tutorial: {
      id: 'tutorial',
      name: 'Tutorial/How-To',
      minDuration: '5:00',
      maxDuration: '60:00',
      defaultPrice: 0.99,
      requiresStudio: false
    },
    vlog: {
      id: 'vlog',
      name: 'Vlog/Daily Content',
      minDuration: '2:00',
      maxDuration: '30:00',
      defaultPrice: 0.00, // Free with ads
      requiresStudio: false,
      monetizationStyle: 'ads'
    },
    short_film: {
      id: 'short_film',
      name: 'Short Film',
      minDuration: '5:00',
      maxDuration: '30:00',
      defaultPrice: 1.99,
      requiresStudio: true
    },
    series: {
      id: 'series',
      name: 'Series (Multiple Episodes)',
      minDuration: '3:00 per episode',
      maxDuration: 'unlimited',
      defaultPrice: 3.99, // Per episode
      requiresStudio: true,
      monetizationStyle: 'subscription'
    }
  },

  // ===== THEATERS =====
  theaters: {
    downtown_theater: {
      id: 'theater_downtown',
      name: 'Vision Storms Downtown Theater',
      location: { x: 150, y: 0, z: 120 },
      screens: 8,
      seatsPerScreen: 200,
      hourlyShowing: 2, // Showings per hour
      currentlyShowing: [], // array of content IDs
      venueRate: 0.05 // Theater takes 5%, creator keeps 50%
    },
    indie_theater: {
      id: 'theater_indie',
      name: 'Independent Creator Theater',
      location: { x: 120, y: 0, z: 180 },
      screens: 4,
      seatsPerScreen: 100,
      hourlyShowing: 2,
      currentlyShowing: [],
      venueRate: 0.05
    }
  },

  // ===== CREATOR PROJECTS =====
  creatorProjects: {}, // creatorId -> array of projects
  creatorStats: {}, // creatorId -> { earnings, views, subscribers, etc }

  // ===== BOOKING A STUDIO =====
  bookStudio: (creatorId, studioId, hoursNeeded, projectName) => {
    const studio = get().studios[studioId]
    if (!studio || !studio.available) return { success: false, error: 'Studio unavailable' }

    const bookingId = `booking_${Date.now()}`
    const cost = studio.hourlyRate * hoursNeeded

    return {
      success: true,
      bookingId,
      studioId,
      studioName: studio.name,
      hoursBooked: hoursNeeded,
      totalCost: cost,
      equipment: studio.equipment,
      capacity: studio.capacity,
      startTime: Date.now(),
      endTime: Date.now() + (hoursNeeded * 3600 * 1000)
    }
  },

  // ===== CREATE CONTENT PROJECT =====
  createContentProject: (creatorId, projectData) => {
    const projectId = `project_${Date.now()}`

    const project = {
      id: projectId,
      creatorId: creatorId,
      title: projectData.title,
      description: projectData.description,
      contentType: projectData.contentType,
      status: 'in_production', // in_production, ready_to_publish, published, archived
      createdAt: Date.now(),
      duration: projectData.duration || '0:00',
      thumbnail: projectData.thumbnail || null,
      files: [],
      metadata: {
        quality: projectData.quality || '1080p',
        format: projectData.format || 'mp4',
        captions: projectData.captions || false
      }
    }

    set(state => ({
      creatorProjects: {
        ...state.creatorProjects,
        [creatorId]: [...(state.creatorProjects[creatorId] || []), project]
      }
    }))

    return project
  },

  // ===== UPLOAD FILES TO PROJECT =====
  uploadContentFile: (projectId, fileName, fileData) => {
    const projects = Object.values(get().creatorProjects).flat()
    const project = projects.find(p => p.id === projectId)

    if (!project) return { success: false, error: 'Project not found' }

    const fileId = `file_${Date.now()}`
    project.files.push({
      id: fileId,
      name: fileName,
      uploadedAt: Date.now(),
      size: fileData.size,
      url: `/content/${projectId}/${fileId}`
    })

    return { success: true, fileId, fileUrl: project.files[project.files.length - 1].url }
  },

  // ===== PUBLISH CONTENT TO THEATER =====
  publishToTheater: (creatorId, projectId, theaterId, pricingData) => {
    const projects = Object.values(get().creatorProjects).flat()
    const project = projects.find(p => p.id === projectId && p.creatorId === creatorId)
    const theater = get().theaters[theaterId]

    if (!project || !theater) return { success: false, error: 'Project or theater not found' }

    const contentId = `content_${Date.now()}`

    const contentListing = {
      id: contentId,
      projectId: projectId,
      creatorId: creatorId,
      title: project.title,
      contentType: project.contentType,
      duration: project.duration,
      thumbnail: project.thumbnail,
      price: pricingData.price || 2.99,
      revenue_split: {
        creator_percent: 55, // Creator gets 55%
        platform_percent: 45 // Trinity gets 45%
      },
      theater: theaterId,
      publishedAt: Date.now(),
      views: 0,
      revenue: 0,
      earnings_creator: 0,
      earnings_platform: 0,
      status: 'available'
    }

    set(state => ({
      theaters: {
        ...state.theaters,
        [theaterId]: {
          ...theater,
          currentlyShowing: [...theater.currentlyShowing, contentId]
        }
      }
    }))

    return {
      success: true,
      contentId,
      listing: contentListing,
      message: `${project.title} is now showing in ${theater.name}`
    }
  },

  // ===== WATCH CONTENT (Player purchases) =====
  watchContent: (playerId, contentId) => {
    const theaters = Object.values(get().theaters)
    let content = null
    let theater = null

    // Find content in theaters
    for (let t of theaters) {
      const found = t.currentlyShowing.find(cId => cId === contentId)
      if (found) {
        theater = t
        // In real implementation, fetch full content details
        content = { id: contentId }
        break
      }
    }

    if (!content || !theater) return { success: false, error: 'Content not found' }

    // Calculate earnings
    const viewPrice = 2.99 // Default, should be dynamic
    const creatorEarning = viewPrice * 0.55 // Creator gets 55%
    const platformEarning = viewPrice * 0.45 // Platform gets 45%

    // Update creator earnings
    set(state => ({
      creatorStats: {
        ...state.creatorStats,
        [content.creatorId]: {
          earnings: (state.creatorStats[content.creatorId]?.earnings || 0) + creatorEarning,
          views: (state.creatorStats[content.creatorId]?.views || 0) + 1
        }
      }
    }))

    return {
      success: true,
      contentId,
      creatorEarning: creatorEarning,
      platformEarning: platformEarning,
      message: `Creator earned $${creatorEarning.toFixed(2)}`
    }
  },

  // ===== CREATOR DASHBOARD =====
  getCreatorStats: (creatorId) => {
    const projects = get().creatorProjects[creatorId] || []
    const stats = get().creatorStats[creatorId] || {}

    return {
      totalProjects: projects.length,
      publishedProjects: projects.filter(p => p.status === 'published').length,
      totalViews: stats.views || 0,
      totalEarnings: stats.earnings || 0,
      averageRating: stats.rating || 0,
      subscribers: stats.subscribers || 0,
      recentProjects: projects.slice(-5)
    }
  },

  // ===== WITHDRAW EARNINGS =====
  withdrawEarnings: (creatorId, amount) => {
    const stats = get().creatorStats[creatorId]
    if (!stats || stats.earnings < amount) {
      return { success: false, error: 'Insufficient funds' }
    }

    set(state => ({
      creatorStats: {
        ...state.creatorStats,
        [creatorId]: {
          ...stats,
          earnings: stats.earnings - amount,
          totalWithdrawn: (stats.totalWithdrawn || 0) + amount
        }
      }
    }))

    return {
      success: true,
      amountWithdrawn: amount,
      remainingBalance: stats.earnings - amount,
      transactionId: `txn_${Date.now()}`
    }
  }
}))

// ===== HELPER FUNCTIONS =====

export function getCreatorDashboard(creatorId) {
  return useCreatorContentPlatform.getState().getCreatorStats(creatorId)
}

export function getTheaterShowings(theaterId) {
  const theater = useCreatorContentPlatform.getState().theaters[theaterId]
  return theater?.currentlyShowing || []
}

export function getCreatorProjects(creatorId) {
  const state = useCreatorContentPlatform.getState()
  return state.creatorProjects[creatorId] || []
}
