/**
 * VISION STORMS WORLD - NPC Conversation System
 *
 * Deep conversation trees with dialogue choices:
 * - Topic-based branching dialogue
 * - Educational content delivery
 * - Relationship progression
 * - Personality-driven responses
 * - Consequences for conversation choices
 * - Dialogue unlocking based on reputation/skills
 * - NPC daily topics and moods
 * - Multi-turn conversations
 *
 * Makes NPCs feel like real people with depth and memory
 */

import { create } from 'zustand'

export const useNPCConversationSystem = create((set, get) => ({
  // ===== DIALOGUE TREES =====
  dialogueTrees: {}, // treeId -> dialogue tree structure
  activeConversations: {}, // playerId -> current conversation state

  // ===== CREATE DIALOGUE TREE =====
  createDialogueTree: (treeData) => {
    // treeData = {
    //   npcId, topic, branches, educationalContent
    // }

    const treeId = `tree_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const tree = {
      id: treeId,
      npcId: treeData.npcId,
      topic: treeData.topic,
      rootNode: treeData.rootNode,
      nodes: treeData.nodes || {}, // nodeId -> node data
      educationalContent: treeData.educationalContent || null,
      relationshipImpact: treeData.relationshipImpact || {},
      reputationReward: treeData.reputationReward || 0,
      requiredReputation: treeData.requiredReputation || 0,
      createdAt: Date.now()
    }

    set(state => ({
      dialogueTrees: {
        ...state.dialogueTrees,
        [treeId]: tree
      }
    }))

    return {
      success: true,
      treeId: treeId,
      topic: tree.topic,
      message: `Dialogue tree created for topic: ${tree.topic}`
    }
  },

  // ===== START CONVERSATION =====
  startConversation: (playerId, npcId, topicFilter = null) => {
    // Find available dialogue trees for this NPC
    const availableTrees = Object.values(get().dialogueTrees).filter(tree =>
      tree.npcId === npcId && (!topicFilter || tree.topic === topicFilter)
    )

    if (availableTrees.length === 0) {
      return {
        success: false,
        error: 'No conversations available with this NPC'
      }
    }

    // Select a random available tree
    const selectedTree = availableTrees[Math.floor(Math.random() * availableTrees.length)]

    const conversationId = `conv_${Date.now()}`
    const conversation = {
      id: conversationId,
      playerId: playerId,
      npcId: npcId,
      treeId: selectedTree.id,
      topic: selectedTree.topic,
      currentNodeId: selectedTree.rootNode,
      history: [],
      startedAt: Date.now(),
      relationshipChange: 0
    }

    set(state => ({
      activeConversations: {
        ...state.activeConversations,
        [conversationId]: conversation
      }
    }))

    const rootNode = selectedTree.nodes[selectedTree.rootNode]

    return {
      success: true,
      conversationId: conversationId,
      topic: selectedTree.topic,
      npcDialogue: rootNode.npcLine,
      playerChoices: rootNode.choices,
      conversationContext: rootNode.context || {}
    }
  },

  // ===== MAKE CONVERSATION CHOICE =====
  makeConversationChoice: (conversationId, choiceIndex) => {
    const conversation = get().activeConversations[conversationId]
    if (!conversation) return { success: false, error: 'Conversation not found' }

    const tree = get().dialogueTrees[conversation.treeId]
    const currentNode = tree.nodes[conversation.currentNodeId]

    if (choiceIndex >= currentNode.choices.length) {
      return { success: false, error: 'Invalid choice' }
    }

    const selectedChoice = currentNode.choices[choiceIndex]

    // Record choice in history
    const historyEntry = {
      nodeId: conversation.currentNodeId,
      npcLine: currentNode.npcLine,
      playerChoice: selectedChoice.text,
      consequence: selectedChoice.consequence,
      relationshipChange: selectedChoice.relationshipChange || 0,
      timestamp: Date.now()
    }

    const nextNodeId = selectedChoice.nextNodeId
    const nextNode = tree.nodes[nextNodeId]

    // Check if conversation is ending
    const isEnding = !nextNode || nextNode.type === 'end'

    const updatedConversation = {
      ...conversation,
      currentNodeId: nextNodeId,
      history: [...conversation.history, historyEntry],
      relationshipChange:
        conversation.relationshipChange + (selectedChoice.relationshipChange || 0)
    }

    if (!isEnding) {
      set(state => ({
        activeConversations: {
          ...state.activeConversations,
          [conversationId]: updatedConversation
        }
      }))
    } else {
      // Remove conversation when it ends
      const { [conversationId]: removed, ...remaining } = get().activeConversations
      set(state => ({
        activeConversations: remaining
      }))
    }

    return {
      success: true,
      playerChoice: selectedChoice.text,
      npcResponse: nextNode ? nextNode.npcLine : 'Thank you for talking with me.',
      playerChoices: nextNode ? nextNode.choices : [],
      consequence: selectedChoice.consequence,
      relationshipChange: selectedChoice.relationshipChange || 0,
      educationalContent: nextNode ? nextNode.educationalContent : null,
      isConversationEnding: isEnding,
      totalRelationshipChange: updatedConversation.relationshipChange,
      rewards: isEnding ? calculateConversationRewards(tree, updatedConversation) : {}
    }
  },

  // ===== END CONVERSATION =====
  endConversation: (conversationId, playerId, npcId) => {
    const conversation = get().activeConversations[conversationId]
    if (!conversation) return { success: false }

    const tree = get().dialogueTrees[conversation.treeId]

    const rewards = calculateConversationRewards(tree, conversation)

    // Remove conversation
    const { [conversationId]: removed, ...remaining } = get().activeConversations
    set(state => ({
      activeConversations: remaining
    }))

    return {
      success: true,
      conversationId: conversationId,
      topic: conversation.topic,
      relationshipChanged: conversation.relationshipChange,
      rewards: rewards,
      message: `Conversation with ${npcId} ended.`
    }
  },

  // ===== BANK TELLER CONVERSATIONS =====
  createBankTellerDialogue: () => {
    const treeId = `tree_bank_teller_${Date.now()}`

    const tree = {
      id: treeId,
      npcId: 'npc_teller_1',
      topic: 'banking_services',
      rootNode: 'root_001',
      nodes: {
        root_001: {
          type: 'dialogue',
          npcLine: "Hello! Welcome to Bank of Vision. I'm Sarah, a teller here. How can I help you today?",
          context: { location: 'bank', time: 'business_hours' },
          choices: [
            {
              text: "I want to open a new account",
              nextNodeId: 'node_account_001',
              relationshipChange: 5,
              consequence: 'account_opening'
            },
            {
              text: 'I need help with my savings',
              nextNodeId: 'node_savings_001',
              relationshipChange: 3,
              consequence: 'savings_education'
            },
            {
              text: 'Tell me about loans',
              nextNodeId: 'node_loans_001',
              relationshipChange: 2,
              consequence: 'loan_education'
            },
            {
              text: 'Never mind, goodbye',
              nextNodeId: 'node_end_001',
              relationshipChange: 0
            }
          ]
        },
        node_account_001: {
          type: 'dialogue',
          npcLine:
            "Great! Opening an account is easy. You'll need a government ID and proof of address. We have checking and savings accounts. Checking is for daily transactions, savings earns interest over time.",
          educationalContent: {
            title: 'Bank Accounts 101',
            content: 'Learn the difference between checking and savings accounts, and how interest works.',
            videoLink: 'https://example.com/accounts'
          },
          choices: [
            {
              text: 'I want a checking account',
              nextNodeId: 'node_end_001',
              relationshipChange: 10,
              consequence: 'account_created'
            },
            {
              text: 'Tell me more about savings',
              nextNodeId: 'node_savings_detail_001',
              relationshipChange: 8
            }
          ]
        },
        node_savings_001: {
          type: 'dialogue',
          npcLine:
            'Great question! Savings accounts help your money grow. You earn interest, which means the bank pays YOU for letting them use your money. The longer you save, the more interest you earn.',
          educationalContent: {
            title: 'Understanding Interest',
            content: 'Simple vs compound interest, and how to maximize your savings.',
            videoLink: 'https://example.com/interest'
          },
          choices: [
            {
              text: 'How much interest can I earn?',
              nextNodeId: 'node_interest_rates_001',
              relationshipChange: 8
            },
            {
              text: 'That sounds good, set one up',
              nextNodeId: 'node_end_001',
              relationshipChange: 10,
              consequence: 'savings_opened'
            }
          ]
        },
        node_loans_001: {
          type: 'dialogue',
          npcLine:
            'Loans are money we lend you that you pay back over time with interest. We have personal loans, auto loans, and mortgages. The interest you pay depends on your credit score and the amount.',
          educationalContent: {
            title: 'Understanding Loans',
            content: 'Types of loans, interest rates, credit scores, and how to borrow responsibly.',
            videoLink: 'https://example.com/loans'
          },
          choices: [
            {
              text: 'What affects my loan approval?',
              nextNodeId: 'node_credit_001',
              relationshipChange: 8
            },
            {
              text: "Thanks for the info. I'll think about it.",
              nextNodeId: 'node_end_001',
              relationshipChange: 5
            }
          ]
        },
        node_savings_detail_001: {
          type: 'dialogue',
          npcLine:
            'Our savings account offers 2% annual interest. That means if you save $1000, after one year you'll have $1020. The amount grows automatically!',
          choices: [
            {
              text: 'I want to open a savings account',
              nextNodeId: 'node_end_001',
              relationshipChange: 10,
              consequence: 'savings_opened'
            }
          ]
        },
        node_interest_rates_001: {
          type: 'dialogue',
          npcLine:
            'Our current rates are 2% for regular savings and 3.5% for long-term savings accounts. Higher interest rates reward you for keeping your money with us longer.',
          choices: [
            {
              text: 'That sounds great!',
              nextNodeId: 'node_end_001',
              relationshipChange: 8,
              consequence: 'interested_in_savings'
            }
          ]
        },
        node_credit_001: {
          type: 'dialogue',
          npcLine:
            'Your credit score is crucial. It shows how responsible you are with money. Pay your bills on time, keep balances low, and avoid too many loans at once. Your score grows over time with good financial habits.',
          educationalContent: {
            title: 'Credit Scores',
            content: 'What affects your credit score and how to build excellent credit.',
            videoLink: 'https://example.com/credit'
          },
          choices: [
            {
              text: "I'm going to work on my credit score",
              nextNodeId: 'node_end_001',
              relationshipChange: 10,
              consequence: 'credit_focused'
            }
          ]
        },
        node_end_001: {
          type: 'end',
          npcLine: "Thanks for coming in! Feel free to come back anytime. We're here to help you build wealth!"
        }
      },
      reputationReward: 25,
      educationalContent: 'Banking Fundamentals'
    }

    set(state => ({
      dialogueTrees: {
        ...state.dialogueTrees,
        [treeId]: tree
      }
    }))

    return {
      success: true,
      treeId: treeId,
      npcId: 'npc_teller_1',
      topic: 'banking_services'
    }
  },

  // ===== TEACHER CONVERSATIONS =====
  createTeacherDialogue: () => {
    const treeId = `tree_teacher_${Date.now()}`

    const tree = {
      id: treeId,
      npcId: 'npc_teacher_1',
      topic: 'financial_education',
      rootNode: 'root_teach_001',
      nodes: {
        root_teach_001: {
          type: 'dialogue',
          npcLine:
            "Welcome to my class! I'm Professor Williams. I teach financial literacy and business fundamentals. What would you like to learn about today?",
          choices: [
            {
              text: 'Teach me about compound interest',
              nextNodeId: 'teach_compound_001',
              relationshipChange: 10,
              consequence: 'learning_interested'
            },
            {
              text: 'How do I start a business?',
              nextNodeId: 'teach_business_001',
              relationshipChange: 10,
              consequence: 'entrepreneurship_interested'
            },
            {
              text: 'Tell me about budgeting',
              nextNodeId: 'teach_budget_001',
              relationshipChange: 8
            }
          ]
        },
        teach_compound_001: {
          type: 'dialogue',
          npcLine:
            'Excellent question! Compound interest is when you earn interest on your interest. It\'s one of the most powerful financial tools. Starting early and being patient creates exponential growth over time.',
          educationalContent: {
            title: 'Compound Interest',
            content: 'The math behind compound interest and real-world examples of wealth building.'
          },
          choices: [
            {
              text: 'Show me an example',
              nextNodeId: 'teach_compound_example_001',
              relationshipChange: 8
            }
          ]
        },
        teach_compound_example_001: {
          type: 'dialogue',
          npcLine:
            'If you invest $5000 at age 25 with 8% annual returns, by age 65 you\'ll have over $160,000! That\'s the power of 40 years of compound growth. Start early, invest consistently, and be patient.',
          choices: [
            {
              text: "I'm going to start investing!",
              nextNodeId: 'teach_end_001',
              relationshipChange: 15,
              consequence: 'committed_to_investing'
            }
          ]
        },
        teach_business_001: {
          type: 'dialogue',
          npcLine:
            'Starting a business takes planning. You need a business plan, funding, and understanding of taxes. Many successful entrepreneurs started with a small idea and grew it step by step.',
          educationalContent: {
            title: 'Business Fundamentals',
            content: 'Steps to starting your own business, from idea to launch.'
          },
          choices: [
            {
              text: 'What are the first steps?',
              nextNodeId: 'teach_business_steps_001',
              relationshipChange: 10
            }
          ]
        },
        teach_business_steps_001: {
          type: 'dialogue',
          npcLine:
            'Step 1: Identify your skill or product. Step 2: Research your market. Step 3: Create a business plan. Step 4: Find funding. Step 5: Register your business legally. Step 6: Launch and scale!',
          choices: [
            {
              text: 'I have a business idea!',
              nextNodeId: 'teach_end_001',
              relationshipChange: 15,
              consequence: 'entrepreneurial_journey_started'
            }
          ]
        },
        teach_budget_001: {
          type: 'dialogue',
          npcLine:
            'Budgeting is controlling your money instead of letting money control you. Track your income, categorize expenses, and make sure you\'re saving money every month.',
          educationalContent: {
            title: 'Budgeting Basics',
            content: 'The 50/30/20 rule and creating a budget that works for you.'
          },
          choices: [
            {
              text: 'Help me create a budget',
              nextNodeId: 'teach_end_001',
              relationshipChange: 12,
              consequence: 'budget_created'
            }
          ]
        },
        teach_end_001: {
          type: 'end',
          npcLine:
            'I\'m proud of you for learning about financial literacy. These skills will serve you for life. Keep studying and applying what you learn!'
        }
      },
      reputationReward: 50,
      educationalContent: 'Financial Literacy Masterclass'
    }

    set(state => ({
      dialogueTrees: {
        ...state.dialogueTrees,
        [treeId]: tree
      }
    }))

    return {
      success: true,
      treeId: treeId,
      npcId: 'npc_teacher_1',
      topic: 'financial_education'
    }
  },

  // ===== GET CONVERSATION STATE =====
  getConversationState: (conversationId) => {
    return get().activeConversations[conversationId] || null
  },

  // ===== GET NPC DIALOGUE TOPICS =====
  getNPCDialogueTopics: (npcId) => {
    return Object.values(get().dialogueTrees)
      .filter(tree => tree.npcId === npcId)
      .map(tree => ({
        treeId: tree.id,
        topic: tree.topic,
        requiredReputation: tree.requiredReputation,
        reputationReward: tree.reputationReward
      }))
  }
}))

// ===== HELPER FUNCTIONS =====

function calculateConversationRewards(tree, conversation) {
  const completionBonus = 100
  const relationshipBonus = Math.abs(conversation.relationshipChange) * 10
  const reputationReward = tree.reputationReward

  return {
    credits: completionBonus,
    relationshipChange: conversation.relationshipChange,
    reputationGained: reputationReward,
    totalReward: completionBonus + reputationReward
  }
}

export function getDialogueTreeCount() {
  return Object.keys(useNPCConversationSystem.getState().dialogueTrees).length
}

export function getAllDialogueTrees() {
  return useNPCConversationSystem.getState().dialogueTrees
}
