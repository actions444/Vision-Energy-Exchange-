import { create } from 'zustand'

/**
 * Homework & Assignment System
 *
 * NPCs assign homework to students
 * Multiple assignment types: multiple choice, puzzles, essays, calculations
 * Track completion and grades
 * Impact on education progress
 */

export const ASSIGNMENT_TYPES = {
  multiple_choice: 'multiple_choice',
  short_answer: 'short_answer',
  essay: 'essay',
  puzzle: 'puzzle',
  calculation: 'calculation',
  project: 'project',
  discussion: 'discussion',
  practical: 'practical'
}

export const useHomeworkSystem = create((set, get) => ({
  // Assignments database
  assignments: {}, // assignmentId -> assignment data
  studentSubmissions: {}, // submissionId -> submission data
  studentGrades: {}, // studentId -> grades by assignment

  // ===== CREATE ASSIGNMENT =====
  assignHomework: (courseId, instructorId, studentId, type = 'multiple_choice') => {
    const assignmentId = `hw_${courseId}_${instructorId}_${Date.now()}`

    set(state => ({
      assignments: {
        ...state.assignments,
        [assignmentId]: {
          assignmentId,
          courseId,
          instructorId,
          studentId,
          type,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
          content: getAssignmentContent(type, courseId),
          status: 'assigned',
          assignedAt: new Date(),
          submitted: false,
          graded: false,
          grade: null,
          feedback: null
        }
      }
    }))

    return assignmentId
  },

  // ===== ASSIGNMENT TYPES =====

  // Multiple choice assignment
  createMultipleChoice: (assignmentId, questions) => {
    set(state => ({
      assignments: {
        ...state.assignments,
        [assignmentId]: {
          ...state.assignments[assignmentId],
          type: 'multiple_choice',
          questions, // [{ id, question, options: ['a', 'b', 'c', 'd'], correctAnswer, explanation }]
          totalQuestions: questions.length,
          passingScore: 70
        }
      }
    }))
  },

  // Puzzle assignment
  createPuzzle: (assignmentId, puzzleData) => {
    set(state => ({
      assignments: {
        ...state.assignments,
        [assignmentId]: {
          ...state.assignments[assignmentId],
          type: 'puzzle',
          puzzle: puzzleData, // { type, difficulty, description, solution, hints }
          hints: puzzleData.hints || [],
          difficulty: puzzleData.difficulty || 'medium'
        }
      }
    }))
  },

  // Calculation assignment
  createCalculation: (assignmentId, problems) => {
    set(state => ({
      assignments: {
        ...state.assignments,
        [assignmentId]: {
          ...state.assignments[assignmentId],
          type: 'calculation',
          problems, // [{ id, problem, correctAnswer, allowedError }]
          totalProblems: problems.length
        }
      }
    }))
  },

  // Essay assignment
  createEssay: (assignmentId, prompt, rubric) => {
    set(state => ({
      assignments: {
        ...state.assignments,
        [assignmentId]: {
          ...state.assignments[assignmentId],
          type: 'essay',
          prompt,
          rubric, // { thesis: 10, evidence: 20, structure: 20, writing: 10 }
          wordCountMin: 500,
          wordCountMax: 2000
        }
      }
    }))
  },

  // ===== SUBMIT ASSIGNMENT =====
  submitAssignment: (assignmentId, studentId, answers) => {
    const assignment = get().assignments[assignmentId]
    if (!assignment) return false

    const submissionId = `sub_${assignmentId}_${studentId}_${Date.now()}`

    set(state => ({
      studentSubmissions: {
        ...state.studentSubmissions,
        [submissionId]: {
          submissionId,
          assignmentId,
          studentId,
          answers,
          submittedAt: new Date(),
          status: 'submitted',
          graded: false
        }
      },
      assignments: {
        ...state.assignments,
        [assignmentId]: {
          ...state.assignments[assignmentId],
          submitted: true,
          status: 'submitted',
          submittedAt: new Date()
        }
      }
    }))

    return submissionId
  },

  // ===== GRADING =====
  gradeMultipleChoice: (submissionId) => {
    const submission = get().studentSubmissions[submissionId]
    const assignment = get().assignments[submission.assignmentId]

    if (!submission || !assignment) return null

    let correctCount = 0
    const totalQuestions = assignment.totalQuestions

    // Check each answer
    submission.answers.forEach((answer, idx) => {
      if (answer === assignment.questions[idx].correctAnswer) {
        correctCount++
      }
    })

    const score = Math.round((correctCount / totalQuestions) * 100)
    const passed = score >= assignment.passingScore

    set(state => ({
      studentSubmissions: {
        ...state.studentSubmissions,
        [submissionId]: {
          ...state.studentSubmissions[submissionId],
          graded: true,
          grade: score,
          correctAnswers: correctCount,
          totalAnswers: totalQuestions,
          passed
        }
      },
      assignments: {
        ...state.assignments,
        [assignment.assignmentId]: {
          ...state.assignments[assignment.assignmentId],
          graded: true,
          grade: score
        }
      },
      studentGrades: {
        ...state.studentGrades,
        [submission.studentId]: {
          ...state.studentGrades[submission.studentId],
          [assignment.assignmentId]: {
            score,
            passed,
            gradedAt: new Date()
          }
        }
      }
    }))

    return {
      score,
      correctAnswers: correctCount,
      totalQuestions,
      passed,
      feedback: generateFeedback(score, assignment.passingScore)
    }
  },

  gradePuzzle: (submissionId) => {
    const submission = get().studentSubmissions[submissionId]
    const assignment = get().assignments[submission.assignmentId]

    if (!submission || !assignment) return null

    const correct = submission.answers[0] === assignment.puzzle.solution
    const score = correct ? 100 : 0

    set(state => ({
      studentSubmissions: {
        ...state.studentSubmissions,
        [submissionId]: {
          ...state.studentSubmissions[submissionId],
          graded: true,
          grade: score,
          correct
        }
      },
      studentGrades: {
        ...state.studentGrades,
        [submission.studentId]: {
          ...state.studentGrades[submission.studentId],
          [assignment.assignmentId]: {
            score,
            correct,
            difficulty: assignment.difficulty
          }
        }
      }
    }))

    return {
      score,
      correct,
      solution: assignment.puzzle.solution,
      feedback: correct ? '🎉 Puzzle solved!' : '⏳ Keep trying - use the hints!'
    }
  },

  gradeCalculation: (submissionId) => {
    const submission = get().studentSubmissions[submissionId]
    const assignment = get().assignments[submission.assignmentId]

    if (!submission || !assignment) return null

    let correctCount = 0
    const results = []

    submission.answers.forEach((answer, idx) => {
      const problem = assignment.problems[idx]
      const isCorrect = Math.abs(answer - problem.correctAnswer) <= (problem.allowedError || 0.01)
      if (isCorrect) correctCount++

      results.push({
        correct: isCorrect,
        studentAnswer: answer,
        correctAnswer: problem.correctAnswer
      })
    })

    const score = Math.round((correctCount / assignment.totalProblems) * 100)

    set(state => ({
      studentSubmissions: {
        ...state.studentSubmissions,
        [submissionId]: {
          ...state.studentSubmissions[submissionId],
          graded: true,
          grade: score,
          results
        }
      },
      studentGrades: {
        ...state.studentGrades,
        [submission.studentId]: {
          ...state.studentGrades[submission.studentId],
          [assignment.assignmentId]: {
            score,
            correctProblems: correctCount,
            totalProblems: assignment.totalProblems
          }
        }
      }
    }))

    return {
      score,
      correctProblems: correctCount,
      totalProblems: assignment.totalProblems,
      results
    }
  },

  // ===== ASSIGNMENT QUERIES =====
  getStudentAssignments: (studentId) => {
    return Object.values(get().assignments).filter(a => a.studentId === studentId)
  },

  getPendingAssignments: (studentId) => {
    return Object.values(get().assignments).filter(a =>
      a.studentId === studentId && !a.submitted
    )
  },

  getCompletedAssignments: (studentId) => {
    return Object.values(get().assignments).filter(a =>
      a.studentId === studentId && a.graded
    )
  },

  getStudentGrade: (studentId, assignmentId) => {
    return get().studentGrades[studentId]?.[assignmentId]
  },

  getStudentGPA: (studentId) => {
    const grades = get().studentGrades[studentId]
    if (!grades || Object.keys(grades).length === 0) return 0

    const scores = Object.values(grades).map(g => g.score)
    const average = scores.reduce((a, b) => a + b, 0) / scores.length
    return Math.round(average)
  },

  getAssignmentStats: (assignmentId) => {
    const submissions = Object.values(get().studentSubmissions).filter(
      s => s.assignmentId === assignmentId && s.graded
    )

    if (submissions.length === 0) return null

    const scores = submissions.map(s => s.grade)
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const highest = Math.max(...scores)
    const lowest = Math.min(...scores)
    const passingCount = scores.filter(s => s >= 70).length

    return {
      totalSubmissions: submissions.length,
      averageScore: average,
      highestScore: highest,
      lowestScore: lowest,
      passingCount,
      passingRate: Math.round((passingCount / submissions.length) * 100)
    }
  },

  // ===== RETRY & IMPROVEMENT =====
  allowRetry: (assignmentId, studentId) => {
    const submission = get().studentSubmissions[
      Object.keys(get().studentSubmissions).find(
        k => get().studentSubmissions[k].assignmentId === assignmentId &&
             get().studentSubmissions[k].studentId === studentId
      )
    ]

    if (!submission) return false

    set(state => ({
      studentSubmissions: {
        ...state.studentSubmissions,
        [submission.submissionId]: {
          ...state.studentSubmissions[submission.submissionId],
          graded: false,
          grade: null,
          submitted: false,
          retryCount: (submission.retryCount || 0) + 1
        }
      }
    }))

    return true
  },

  // ===== PROGRESS TRACKING =====
  getProgressReport: (studentId) => {
    const assignments = get().getStudentAssignments(studentId)
    const completed = get().getCompletedAssignments(studentId)
    const gpa = get().getStudentGPA(studentId)

    return {
      totalAssignments: assignments.length,
      completedAssignments: completed.length,
      completionRate: assignments.length > 0 ? Math.round((completed.length / assignments.length) * 100) : 0,
      gpa,
      performanceLevel: gpa >= 90 ? 'Excellent' : gpa >= 80 ? 'Good' : gpa >= 70 ? 'Satisfactory' : 'Needs Improvement'
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function getAssignmentContent(type, courseId) {
  const examples = {
    'trust_basics_101': {
      multiple_choice: [
        {
          id: 'q1',
          question: 'What is the primary purpose of a trust?',
          options: ['Asset protection', 'Tax evasion', 'Hiding money', 'All of above'],
          correctAnswer: 'Asset protection',
          explanation: 'Trusts protect assets and avoid probate'
        },
        {
          id: 'q2',
          question: 'Can you modify a revocable living trust?',
          options: ['Yes, anytime', 'Never', 'Only once', 'Only with lawyer approval'],
          correctAnswer: 'Yes, anytime',
          explanation: 'Revocable means you can change it anytime'
        }
      ]
    },
    'interest_basics_101': {
      calculation: [
        {
          id: 'p1',
          problem: 'Calculate compound interest: $1000 at 5% for 10 years',
          correctAnswer: 1629,
          allowedError: 10
        },
        {
          id: 'p2',
          problem: 'Calculate daily compound interest: $5000 at 4% daily compounded for 5 years',
          correctAnswer: 6107,
          allowedError: 20
        }
      ]
    }
  }

  return examples[courseId]?.[type] || []
}

function generateFeedback(score, passingScore) {
  if (score >= 95) return '🌟 Outstanding! You mastered this material!'
  if (score >= 90) return '⭐ Excellent work! You understand this well.'
  if (score >= 80) return '👍 Great job! You have a solid understanding.'
  if (score >= 70) return '✅ Good work! You passed. Review the concepts you missed.'
  if (score >= 60) return '📚 You\'re close. Study more and try again.'
  return '💪 Keep studying! You\'ll get it next time.'
}
