/**
 * VISION STORMS WORLD - Streaming Integration System
 *
 * Players broadcast their gameplay:
 * - Twitch live streaming integration
 * - YouTube Live streaming
 * - Stream analytics and stats
 * - Chat integration with viewers
 * - Viewer rewards and engagement
 * - Monetization through tips/donations
 * - Stream scheduling
 * - Archive management
 * - Community building through streams
 *
 * Turns gameplay into social entertainment
 */

import { create } from 'zustand'

export const useStreamingIntegrationSystem = create((set, get) => ({
  // ===== STREAMING REGISTRY =====
  streamChannels: {}, // channelId -> channel data
  playerStreams: {}, // playerId -> [streamIds]
  liveStreams: {}, // streamId -> live stream data
  streamArchives: {}, // streamId -> archive data
  viewerData: {}, // streamId -> viewer metrics

  // ===== CREATE STREAM CHANNEL =====
  createStreamChannel: (playerId, channelData) => {
    // channelData = {
    //   platform, channelName, displayName, description
    //   category, avatar, banner
    // }

    const channelId = `channel_${playerId}_${Date.now()}`

    const channel = {
      id: channelId,
      playerId: playerId,
      platform: channelData.platform, // twitch, youtube, both
      channelName: channelData.channelName,
      displayName: channelData.displayName,
      description: channelData.description,
      category: channelData.category || 'Gameplay',
      avatar: channelData.avatar,
      banner: channelData.banner,

      // STATISTICS
      totalFollowers: 0,
      totalSubscribers: 0,
      totalViews: 0,
      averageViewers: 0,
      peakViewers: 0,

      // STREAMS
      totalLiveStreams: 0,
      totalStreamHours: 0,
      currentlyLive: false,

      // MONETIZATION
      totalRevenue: 0,
      pendingRevenue: 0,
      withdrawalMinimum: 100,

      // ENGAGEMENT
      followers: [],
      subscribers: [],
      mods: [],
      vip: [],

      // SCHEDULE
      streamSchedule: [],
      lastStreamDate: null,
      nextStreamDate: null,

      // STATUS
      verified: false,
      suspended: false,
      createdAt: Date.now()
    }

    set(state => ({
      streamChannels: {
        ...state.streamChannels,
        [channelId]: channel
      },
      playerStreams: {
        ...state.playerStreams,
        [playerId]: [...(state.playerStreams[playerId] || []), channelId]
      }
    }))

    return {
      success: true,
      channelId: channelId,
      platform: channel.platform,
      channelName: channel.channelName,
      displayName: channel.displayName,
      message: `Stream channel "${channel.displayName}" created on ${channel.platform}!`,
      nextSteps: [
        'Set up stream alerts',
        'Create stream overlays',
        'Schedule your first stream',
        'Build your audience'
      ]
    }
  },

  // ===== START LIVE STREAM =====
  startLiveStream: (playerId, channelId, streamData) => {
    // streamData = {
    //   title, description, game, thumbnail
    // }

    const channel = get().streamChannels[channelId]
    if (!channel || channel.playerId !== playerId) {
      return { success: false, error: 'Channel not found' }
    }

    const streamId = `stream_${channelId}_${Date.now()}`

    const liveStream = {
      id: streamId,
      channelId: channelId,
      playerId: playerId,
      title: streamData.title,
      description: streamData.description,
      game: streamData.game || 'Vision Storms World',
      thumbnail: streamData.thumbnail,
      startTime: Date.now(),
      endTime: null,
      duration: 0,

      // VIEWERS
      currentViewers: 0,
      peakViewers: 0,
      totalViews: 0,
      uniqueViewers: 0,

      // CHAT
      totalMessages: 0,
      chatters: [],

      // MONETIZATION
      revenue: 0,
      tips: 0,
      subscriptions: 0,
      bits: 0,

      // ENGAGEMENT
      likes: 0,
      comments: 0,
      shares: 0,
      raids: 0,
      follows: 0,

      // STATUS
      status: 'live',
      platform: channel.platform,
      isArchived: false
    }

    set(state => ({
      liveStreams: {
        ...state.liveStreams,
        [streamId]: liveStream
      },
      streamChannels: {
        ...state.streamChannels,
        [channelId]: {
          ...channel,
          currentlyLive: true,
          totalLiveStreams: channel.totalLiveStreams + 1
        }
      }
    }))

    return {
      success: true,
      streamId: streamId,
      title: liveStream.title,
      status: 'LIVE',
      message: `🔴 LIVE: "${liveStream.title}" on ${liveStream.platform}!`,
      streamUrl: `https://${liveStream.platform}.com/${channel.channelName}`,
      shareableLink: `https://www.vision-storms.com/stream/${streamId}`
    }
  },

  // ===== UPDATE STREAM METRICS =====
  updateStreamMetrics: (streamId, metricsData) => {
    // metricsData = {
    //   currentViewers, totalViews, chatMessages, tips, follows
    // }

    const stream = get().liveStreams[streamId]
    if (!stream) return { success: false }

    const updatedStream = {
      ...stream,
      currentViewers: metricsData.currentViewers || stream.currentViewers,
      totalViews: metricsData.totalViews || stream.totalViews,
      totalMessages: metricsData.chatMessages
        ? stream.totalMessages + metricsData.chatMessages
        : stream.totalMessages,
      revenue: metricsData.tips ? stream.revenue + metricsData.tips : stream.revenue,
      follows: metricsData.follows
        ? stream.follows + metricsData.follows
        : stream.follows
    }

    // Track peak viewers
    if (updatedStream.currentViewers > updatedStream.peakViewers) {
      updatedStream.peakViewers = updatedStream.currentViewers
    }

    set(state => ({
      liveStreams: {
        ...state.liveStreams,
        [streamId]: updatedStream
      }
    }))

    return {
      success: true,
      streamId: streamId,
      currentViewers: updatedStream.currentViewers,
      peakViewers: updatedStream.peakViewers,
      totalViews: updatedStream.totalViews,
      revenue: updatedStream.revenue
    }
  },

  // ===== END STREAM =====
  endLiveStream: (streamId) => {
    const stream = get().liveStreams[streamId]
    if (!stream) return { success: false }

    const endTime = Date.now()
    const duration = Math.floor((endTime - stream.startTime) / 60000) // minutes

    const completedStream = {
      ...stream,
      status: 'ended',
      endTime: endTime,
      duration: duration,
      isArchived: true
    }

    const channel = get().streamChannels[stream.channelId]

    set(state => ({
      liveStreams: {
        ...state.liveStreams,
        [streamId]: completedStream
      },
      streamArchives: {
        ...state.streamArchives,
        [streamId]: completedStream
      },
      streamChannels: {
        ...state.streamChannels,
        [stream.channelId]: {
          ...channel,
          currentlyLive: false,
          totalStreamHours: channel.totalStreamHours + duration / 60,
          lastStreamDate: endTime,
          totalRevenue: channel.totalRevenue + stream.revenue,
          totalViews: channel.totalViews + stream.totalViews,
          averageViewers: Math.floor(stream.totalViews / Math.max(1, duration))
        }
      }
    }))

    return {
      success: true,
      streamId: streamId,
      title: stream.title,
      duration: duration,
      totalViewers: stream.totalViews,
      peakViewers: stream.peakViewers,
      revenue: stream.revenue,
      message: `Stream ended! Final stats: ${stream.totalViews} views, $${stream.revenue} earned`,
      streamStats: {
        duration: duration,
        totalViewers: stream.totalViews,
        averageViewers: Math.floor(stream.totalViews / Math.max(1, duration)),
        chatMessages: stream.totalMessages,
        revenue: stream.revenue,
        newFollows: stream.follows
      }
    }
  },

  // ===== SCHEDULE STREAM =====
  scheduleStream: (playerId, channelId, scheduleData) => {
    // scheduleData = {
    //   date, time, title, description, frequency
    // }

    const channel = get().streamChannels[channelId]
    if (!channel) return { success: false }

    const scheduledStream = {
      id: `scheduled_${Date.now()}`,
      channelId: channelId,
      title: scheduleData.title,
      description: scheduleData.description,
      scheduledDate: scheduleData.date,
      scheduledTime: scheduleData.time,
      frequency: scheduleData.frequency || 'once', // once, daily, weekly
      notifyFollowers: true,
      reminders: [1440, 60, 15] // minutes before stream
    }

    set(state => ({
      streamChannels: {
        ...state.streamChannels,
        [channelId]: {
          ...channel,
          streamSchedule: [...channel.streamSchedule, scheduledStream]
        }
      }
    }))

    return {
      success: true,
      scheduledStream: scheduledStream.id,
      title: scheduledStream.title,
      scheduledFor: new Date(scheduleData.date).toLocaleDateString(),
      time: scheduleData.time,
      message: `Stream scheduled: "${scheduleData.title}" on ${new Date(scheduleData.date).toLocaleDateString()}`
    }
  },

  // ===== GET CHANNEL ANALYTICS =====
  getChannelAnalytics: (channelId) => {
    const channel = get().streamChannels[channelId]
    if (!channel) return null

    const archiveIds = Object.keys(get().streamArchives).filter(
      id => get().streamArchives[id].channelId === channelId
    )

    const archives = archiveIds.map(id => get().streamArchives[id])

    const totalHours = archives.reduce((sum, s) => sum + s.duration / 60, 0)
    const averageViewers = archives.length > 0
      ? Math.floor(archives.reduce((sum, s) => sum + s.peakViewers, 0) / archives.length)
      : 0

    return {
      channelId: channelId,
      displayName: channel.displayName,
      platform: channel.platform,
      totalFollowers: channel.totalFollowers,
      totalSubscribers: channel.totalSubscribers,
      totalViews: channel.totalViews,
      totalStreamHours: Math.floor(totalHours),
      averageViewers: averageViewers,
      totalRevenue: channel.totalRevenue,
      streamCount: archives.length,
      lastStreamDate: channel.lastStreamDate
        ? new Date(channel.lastStreamDate).toLocaleDateString()
        : 'Never'
    }
  },

  // ===== GET LIVE STREAMS =====
  getLiveStreams: () => {
    return Object.values(get().liveStreams).filter(s => s.status === 'live')
  },

  // ===== GET STREAM ARCHIVES =====
  getStreamArchives: (channelId = null) => {
    let archives = Object.values(get().streamArchives)

    if (channelId) {
      archives = archives.filter(a => a.channelId === channelId)
    }

    return archives.sort((a, b) => b.startTime - a.startTime)
  }
}))

export function getChannelCount() {
  return Object.keys(useStreamingIntegrationSystem.getState().streamChannels).length
}

export function getAllChannels() {
  return useStreamingIntegrationSystem.getState().streamChannels
}
