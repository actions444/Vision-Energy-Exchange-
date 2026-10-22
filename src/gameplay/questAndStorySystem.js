/**
 * VISION STORMS WORLD - Quest & Story System
 *
 * Player progression through missions and narratives:
 * - Quest tracking with objectives and completion
 * - Story arcs tied to NPCs and locations
 * - Chapter progression system
 * - Dynamic quest generation from encounters
 * - Quest rewards (credits, items, reputation, unlocks)
 * - Multi-part story chains
 * - Player choice consequences in quests
 * - Quest difficulty and scaling
 * - Achievement tracking
 *
 * Creates meaningful progression and narrative depth
 */

import { create } from 'zustand'

export const useQuestAndStorySystem = create((set, get) => ({
  // ===== QUEST REGISTRY =====
  quests: {}, // questId -> quest data
  playerQuests: {}, // playerId -> [questIds] (active quests)
  completedQuests: {}, // playerId -> [questIds] (finished quests)
  storyArcs: {}, // arcId -> story arc data
  chapters: {}, // chapterId -> chapter data

  // ===== CREATE QUEST =====
  createQuest: (questData) => {
    // questData = {
    //   title, description, type, difficulty, npcId
    //   objectives, rewards, prerequisites, timeLimit
    // }

    const questId = `quest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const quest = {
      id: questId,
      title: questData.title,
      description: questData.description,
      type: questData.type || 'main', // main, side, personal, emergency, tutorial
      difficulty: questData.difficulty || 'normal', // easy, normal, hard, expert
      npcId: questData.npcId || null,
      relatedNPCs: questData.relatedNPCs || [],
      location: questData.location || null,

      // OBJECTIVES
      objectives: questData.objectives || [], // array of objective objects
      objectivesCompleted: 0,
      currentObjective: 0,

      // REWARDS
      rewards: {
        credits: questData.rewards?.credits || 0,
        experience: questData.rewards?.experience || 100,
        reputation: questData.rewards?.reputation || 0,
        items: questData.rewards?.items || [],
        unlocks: questData.rewards?.unlocks || []
      },

      // CONDITIONS
      prerequisites: questData.prerequisites || [],
      timeLimit: questData.timeLimit || null, // milliseconds
      requiredReputation: questData.requiredReputation || 0,

      // STATUS
      status: 'available', // available, active, completed, failed, abandoned
      startedAt: null,
      completedAt: null,
      createdAt: Date.now()
    }

    set(state => ({
      quests: {
        ...state.quests,
        [questId]: quest
      }
    }))

    return {
      success: true,
      questId: questId,
      title: quest.title,
      description: quest.description,
      message: `Quest "${quest.title}" created`
    }
  },

  // ===== ACCEPT QUEST =====
  acceptQuest: (playerId, questId) => {
    const quest = get().quests[questId]
    if (!quest) return { success: false, error: 'Quest not found' }

    if (quest.status !== 'available') {
      return { success: false, error: 'Quest is not available' }
    }

    const updatedQuest = {
      ...quest,
      status: 'active',
      startedAt: Date.now()
    }

    set(state => ({
      quests: {
        ...state.quests,
        [questId]: updatedQuest
      },
      playerQuests: {
        ...state.playerQuests,
        [playerId]: [...(state.playerQuests[playerId] || []), questId]
      }
    }))

    return {
      success: true,
      questId: questId,
      title: updatedQuest.title,
      objectives: updatedQuest.objectives,
      message: `Quest "${updatedQuest.title}" accepted!`,
      firstObjective: updatedQuest.objectives[0]
    }
  },

  // ===== PROGRESS OBJECTIVE =====
  completeObjective: (playerId, questId, objectiveIndex) => {
    const quest = get().quests[questId]
    if (!quest) return { success: false }

    if (objectiveIndex >= quest.objectives.length) {
      return { success: false, error: 'Invalid objective' }
    }

    const updatedQuest = {
      ...quest,
      objectivesCompleted: quest.objectivesCompleted + 1,
      currentObjective: objectiveIndex + 1,
      objectives: quest.objectives.map((obj, i) =>
        i === objectiveIndex ? { ...obj, completed: true } : obj
      )
    }

    set(state => ({
      quests: {
        ...state.quests,
        [questId]: updatedQuest
      }
    }))

    // Check if quest is complete
    const isComplete = updatedQuest.objectivesCompleted === updatedQuest.objectives.length

    return {
      success: true,
      objectiveCompleted: quest.objectives[objectiveIndex].description,
      objectivesRemaining: updatedQuest.objectives.length - updatedQuest.objectivesCompleted,
      questComplete: isComplete,
      message: isComplete
        ? `Quest "${quest.title}" completed!`
        : `Objective ${objectiveIndex + 1} complete! ${updatedQuest.objectives.length - updatedQuest.objectivesCompleted} remaining.`
    }
  },

  // ===== COMPLETE QUEST =====
  completeQuest: (playerId, questId) => {
    const quest = get().quests[questId]
    if (!quest) return { success: false }

    const completedQuest = {
      ...quest,
      status: 'completed',
      completedAt: Date.now()
    }

    set(state => ({
      quests: {
        ...state.quests,
        [questId]: completedQuest
      },
      playerQuests: {
        ...state.playerQuests,
        [playerId]: (state.playerQuests[playerId] || []).filter(id => id !== questId)
      },
      completedQuests: {
        ...state.completedQuests,
        [playerId]: [...(state.completedQuests[playerId] || []), questId]
      }
    }))

    return {
      success: true,
      questId: questId,
      title: completedQuest.title,
      creditsEarned: completedQuest.rewards.credits,
      experienceEarned: completedQuest.rewards.experience,
      reputationEarned: completedQuest.rewards.reputation,
      itemsEarned: completedQuest.rewards.items,
      message: `Quest "${completedQuest.title}" completed! You've earned ${completedQuest.rewards.credits} credits.`,
      totalRewards: {
        credits: completedQuest.rewards.credits,
        experience: completedQuest.rewards.experience,
        reputation: completedQuest.rewards.reputation
      }
    }
  },

  // ===== ABANDON QUEST =====
  abandonQuest: (playerId, questId) => {
    const quest = get().quests[questId]
    if (!quest) return { success: false }

    const abandonedQuest = {
      ...quest,
      status: 'abandoned'
    }

    set(state => ({
      quests: {
        ...state.quests,
        [questId]: abandonedQuest
      },
      playerQuests: {
        ...state.playerQuests,
        [playerId]: (state.playerQuests[playerId] || []).filter(id => id !== questId)
      }
    }))

    return {
      success: true,
      questId: questId,
      message: `Quest "${quest.title}" abandoned.`
    }
  },

  // ===== CREATE STORY ARC =====
  createStoryArc: (arcData) => {
    // arcData = {
    //   title, description, chapters, npcId, theme
    // }

    const arcId = `arc_${Date.now()}`

    const arc = {
      id: arcId,
      title: arcData.title,
      description: arcData.description,
      theme: arcData.theme, // romance, friendship, conflict resolution, mystery, revenge, redemption
      npcId: arcData.npcId,
      chapters: arcData.chapters || [],
      currentChapter: 0,
      status: 'active',
      createdAt: Date.now()
    }

    set(state => ({
      storyArcs: {
        ...state.storyArcs,
        [arcId]: arc
      }
    }))

    return {
      success: true,
      arcId: arcId,
      title: arc.title,
      theme: arc.theme,
      chapters: arc.chapters.length,
      message: `Story arc "${arc.title}" created with ${arc.chapters.length} chapters`
    }
  },

  // ===== PROGRESS STORY ARC =====
  progressStoryArc: (playerId, arcId) => {
    const arc = get().storyArcs[arcId]
    if (!arc) return { success: false }

    const nextChapter = arc.currentChapter + 1

    if (nextChapter >= arc.chapters.length) {
      // Arc is complete
      const completedArc = {
        ...arc,
        status: 'completed',
        currentChapter: nextChapter
      }

      set(state => ({
        storyArcs: {
          ...state.storyArcs,
          [arcId]: completedArc
        }
      }))

      return {
        success: true,
        arcId: arcId,
        arcComplete: true,
        message: `Story arc "${arc.title}" has concluded.`
      }
    }

    const updatedArc = {
      ...arc,
      currentChapter: nextChapter
    }

    set(state => ({
      storyArcs: {
        ...state.storyArcs,
        [arcId]: updatedArc
      }
    }))

    return {
      success: true,
      arcId: arcId,
      currentChapter: nextChapter,
      totalChapters: arc.chapters.length,
      nextChapterTitle: arc.chapters[nextChapter]?.title,
      message: `Progressed to Chapter ${nextChapter + 1} of "${arc.title}"`
    }
  },

  // ===== MAIN STORY QUEST GENERATOR =====
  generateMainStoryQuest: (playerId, chapterNumber) => {
    const questId = `main_story_${chapterNumber}_${Date.now()}`

    const chapters = {
      1: {
        title: 'Welcome to Vision Storms',
        description: 'Learn the basics and meet your first NPC',
        objectives: [
          { description: 'Create your character', completed: false },
          { description: 'Explore the downtown area', completed: false },
          { description: 'Meet your first NPC', completed: false },
          { description: 'Have a conversation', completed: false }
        ],
        rewards: {
          credits: 1000,
          experience: 500,
          reputation: 50
        }
      },
      2: {
        title: 'Your First Job',
        description: 'Apply for and complete your first job',
        objectives: [
          { description: 'Visit the job board', completed: false },
          { description: 'Apply for a job', completed: false },
          { description: 'Complete your first shift', completed: false },
          { description: 'Earn your first paycheck', completed: false }
        ],
        rewards: {
          credits: 2500,
          experience: 1000,
          reputation: 100
        }
      },
      3: {
        title: 'Build Your Network',
        description: 'Deepen relationships with 3 different NPCs',
        objectives: [
          { description: 'Have deep conversations with 3 NPCs', completed: false },
          { description: 'Increase relationship with one NPC by 30 points', completed: false },
          { description: 'Unlock a friendship moment', completed: false },
          { description: 'Learn a valuable secret from someone', completed: false }
        ],
        rewards: {
          credits: 3000,
          experience: 1500,
          reputation: 150
        }
      },
      4: {
        title: 'Community Impact',
        description: 'Help your community grow',
        objectives: [
          { description: 'Complete 5 side quests', completed: false },
          { description: 'Reach 200+ reputation', completed: false },
          { description: 'Help resolve a conflict', completed: false },
          { description: 'Earn recognition from the community', completed: false }
        ],
        rewards: {
          credits: 5000,
          experience: 2000,
          reputation: 200,
          unlocks: ['community_hero_title']
        }
      }
    }

    const chapterData = chapters[chapterNumber] || chapters[1]

    const quest = {
      id: questId,
      title: chapterData.title,
      description: chapterData.description,
      type: 'main',
      difficulty: 'normal',
      chapter: chapterNumber,
      objectives: chapterData.objectives,
      objectivesCompleted: 0,
      currentObjective: 0,
      rewards: chapterData.rewards,
      status: 'available',
      createdAt: Date.now()
    }

    set(state => ({
      quests: {
        ...state.quests,
        [questId]: quest
      }
    }))

    return {
      success: true,
      questId: questId,
      chapter: chapterNumber,
      title: chapterData.title,
      description: chapterData.description,
      objectives: chapterData.objectives,
      rewards: chapterData.rewards
    }
  },

  // ===== GET PLAYER QUESTS =====
  getPlayerQuests: (playerId) => {
    const questIds = get().playerQuests[playerId] || []
    return questIds.map(id => get().quests[id]).filter(q => q && q.status === 'active')
  },

  // ===== GET QUEST PROGRESS =====
  getQuestProgress: (questId) => {
    const quest = get().quests[questId]
    if (!quest) return null

    return {
      questId: questId,
      title: quest.title,
      description: quest.description,
      objectivesCompleted: quest.objectivesCompleted,
      objectivesTotal: quest.objectives.length,
      percentComplete: Math.floor((quest.objectivesCompleted / quest.objectives.length) * 100),
      currentObjective: quest.objectives[quest.currentObjective],
      status: quest.status
    }
  },

  // ===== GET COMPLETED QUESTS =====
  getCompletedQuests: (playerId) => {
    const questIds = get().completedQuests[playerId] || []
    return questIds
      .map(id => get().quests[id])
      .filter(q => q)
      .sort((a, b) => b.completedAt - a.completedAt)
  }
}))

export function getQuestCount() {
  return Object.keys(useQuestAndStorySystem.getState().quests).length
}

export function getAllQuests() {
  return useQuestAndStorySystem.getState().quests
}
