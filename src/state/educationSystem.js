import { create } from 'zustand'
import { getAllCourses } from '../config/educationalCourses'

export const useEducationSystem = create((set, get) => ({
  // Player education state
  playerProfile: {
    enrolledCourses: [], // courseId list
    completedCourses: [],
    certificates: [],
    wallet: 0,
    totalSpent: 0
  },

  // Course enrollments
  enrollments: {}, // courseId -> { studentId, enrolledDate, completedModules, progress, paid }

  // Educational institutions
  institutions: {
    trinity_university: {
      id: 'trinity_university',
      name: 'Trinity Reign Academy',
      type: 'university',
      location: { x: 100, y: 0, z: -100 },
      emoji: '🏫',
      description: 'Premier business, trust law, and entrepreneurship education',
      openHours: { open: 8, close: 20 },
      instructors: [
        { id: 'trinity_reign', name: 'Trinity Reign', specialty: 'Trust Law & Business' },
        { id: 'estate_expert', name: 'Estate Planning Expert', specialty: 'Trust Law' },
        { id: 'entrepreneur_coach', name: 'Entrepreneur Coach', specialty: 'Entrepreneurship' },
        { id: 'business_advisor', name: 'Business Advisor', specialty: 'Complete Business' }
      ],
      courses: ['trust_basics_101', 'texas_living_trust_201', 'trust_types_301', 'ein_business_setup_150', 'become_entrepreneur_101', 'complete_business_101'],
      rating: 4.9,
      students: 0
    }
  },

  // Video management
  videos: {}, // videoId -> { id, title, duration, instructor, courseId, url }
  uploadedVideos: {}, // uploaded video tracking

  // ===== ENROLLMENT SYSTEM =====
  enrollInCourse: (studentId, courseId, studentName = 'Player') => {
    const course = getAllCourses().find(c => c.id === courseId)
    if (!course) return false

    const enrollmentId = `enrollment_${studentId}_${courseId}_${Date.now()}`

    set(state => ({
      enrollments: {
        ...state.enrollments,
        [enrollmentId]: {
          enrollmentId,
          studentId,
          studentName,
          courseId,
          courseName: course.title,
          enrolledDate: new Date(),
          completedModules: [],
          progress: 0,
          paid: false,
          price: course.price,
          certificateEarned: false
        }
      },
      playerProfile: {
        ...state.playerProfile,
        enrolledCourses: [...state.playerProfile.enrolledCourses, courseId]
      }
    }))

    return enrollmentId
  },

  // ===== PAYMENT SYSTEM =====
  payForCourse: (enrollmentId, amount) => {
    set(state => {
      const enrollment = state.enrollments[enrollmentId]
      if (!enrollment || enrollment.paid) return state

      // Check if payment is correct
      if (amount < enrollment.price) {
        return state // Insufficient payment
      }

      // Process payment
      return {
        enrollments: {
          ...state.enrollments,
          [enrollmentId]: {
            ...enrollment,
            paid: true,
            paidDate: new Date(),
            amountPaid: amount
          }
        },
        playerProfile: {
          ...state.playerProfile,
          wallet: Math.max(state.playerProfile.wallet - amount, 0),
          totalSpent: state.playerProfile.totalSpent + amount
        }
      }
    })
  },

  addWalletFunds: (amount) => {
    set(state => ({
      playerProfile: {
        ...state.playerProfile,
        wallet: state.playerProfile.wallet + amount
      }
    }))
  },

  getWalletBalance: () => {
    return get().playerProfile.wallet
  },

  // ===== MODULE & PROGRESS TRACKING =====
  completeModule: (enrollmentId, moduleId) => {
    set(state => {
      const enrollment = state.enrollments[enrollmentId]
      if (!enrollment || !enrollment.paid) return state

      const course = getAllCourses().find(c => c.id === enrollment.courseId)
      if (!course) return state

      // Check if already completed
      if (enrollment.completedModules.includes(moduleId)) {
        return state
      }

      const completedModules = [...enrollment.completedModules, moduleId]
      const progress = Math.round((completedModules.length / course.modules.length) * 100)
      const allComplete = completedModules.length === course.modules.length

      return {
        enrollments: {
          ...state.enrollments,
          [enrollmentId]: {
            ...enrollment,
            completedModules,
            progress,
            certificateEarned: allComplete,
            completionDate: allComplete ? new Date() : enrollment.completionDate
          }
        },
        playerProfile: allComplete ? {
          ...state.playerProfile,
          completedCourses: [...state.playerProfile.completedCourses, enrollment.courseId],
          certificates: [
            ...state.playerProfile.certificates,
            {
              courseId: enrollment.courseId,
              courseName: enrollment.courseName,
              dateEarned: new Date(),
              instructorName: course.instructor,
              certificateId: `cert_${enrollmentId}_${Date.now()}`
            }
          ]
        } : state.playerProfile
      }
    })
  },

  watchVideo: (enrollmentId, videoId) => {
    // Track video watched (could update watch history)
    set(state => {
      const enrollment = state.enrollments[enrollmentId]
      if (!enrollment) return state

      return {
        enrollments: {
          ...state.enrollments,
          [enrollmentId]: {
            ...enrollment,
            videosWatched: [...(enrollment.videosWatched || []), videoId],
            lastActivity: new Date()
          }
        }
      }
    })
  },

  // ===== VIDEO UPLOAD SYSTEM =====
  uploadVideo: (videoId, title, duration, courseId, instructor, videoUrl) => {
    set(state => ({
      uploadedVideos: {
        ...state.uploadedVideos,
        [videoId]: {
          videoId,
          title,
          duration,
          courseId,
          instructor,
          videoUrl,
          uploadedDate: new Date(),
          views: 0,
          uploadedBy: 'admin' // Could be changed to user ID
        }
      }
    }))
  },

  getVideosByModule: (courseId, moduleId) => {
    const course = getAllCourses().find(c => c.id === courseId)
    if (!course) return []

    const module = course.modules.find(m => m.id === moduleId)
    return module?.videos || []
  },

  recordVideoView: (videoId) => {
    set(state => {
      const video = state.uploadedVideos[videoId]
      if (!video) return state

      return {
        uploadedVideos: {
          ...state.uploadedVideos,
          [videoId]: {
            ...video,
            views: (video.views || 0) + 1
          }
        }
      }
    })
  },

  // ===== COURSE BROWSING =====
  getCourseDetails: (courseId) => {
    return getAllCourses().find(c => c.id === courseId)
  },

  getAvailableCourses: () => {
    return getAllCourses()
  },

  getInstitutionCourses: (institutionId) => {
    const institution = get().institutions[institutionId]
    if (!institution) return []

    return institution.courses
      .map(courseId => get().getCourseDetails(courseId))
      .filter(Boolean)
  },

  // ===== STUDENT STATS =====
  getEnrollmentStatus: (enrollmentId) => {
    return get().enrollments[enrollmentId]
  },

  getStudentProgress: (enrollmentId) => {
    const enrollment = get().enrollments[enrollmentId]
    if (!enrollment) return null

    const course = getAllCourses().find(c => c.id === enrollment.courseId)
    if (!course) return null

    return {
      enrollmentId,
      courseId: enrollment.courseId,
      courseName: enrollment.courseName,
      progress: enrollment.progress,
      completedModules: enrollment.completedModules.length,
      totalModules: course.modules.length,
      paid: enrollment.paid,
      certificateEarned: enrollment.certificateEarned,
      enrolledDate: enrollment.enrolledDate
    }
  },

  getPlayerStats: () => {
    const profile = get().playerProfile
    return {
      enrolledCourses: profile.enrolledCourses.length,
      completedCourses: profile.completedCourses.length,
      certificates: profile.certificates.length,
      wallet: profile.wallet,
      totalSpent: profile.totalSpent
    }
  },

  // ===== CERTIFICATION =====
  getCertificate: (certificateId) => {
    const profile = get().playerProfile
    return profile.certificates.find(c => c.certificateId === certificateId)
  },

  getAllCertificates: () => {
    return get().playerProfile.certificates
  },

  generateCertificateText: (certificateId) => {
    const cert = get().getCertificate(certificateId)
    if (!cert) return null

    return {
      title: `Certificate of Completion`,
      courseName: cert.courseName,
      awardedTo: 'Student of Vision Storms World',
      dateEarned: cert.dateEarned,
      instructor: cert.instructorName,
      certificateNumber: certificateId,
      issuer: 'Trinity Reign Academy'
    }
  },

  // ===== INSTRUCTOR SYSTEM =====
  getInstructor: (instructorId) => {
    const institution = Object.values(get().institutions).find(inst =>
      inst.instructors.some(instr => instr.id === instructorId)
    )

    if (!institution) return null
    return institution.instructors.find(instr => instr.id === instructorId)
  },

  getInstructorCourses: (instructorId) => {
    return getAllCourses().filter(course => {
      const instructor = get().getInstructor(instructorId)
      return instructor && course.instructor.includes(instructor.name)
    })
  },

  // ===== INSTITUTION STATS =====
  getInstitutionStats: (institutionId) => {
    const institution = get().institutions[institutionId]
    if (!institution) return null

    const enrollmentEntries = Object.values(get().enrollments).filter(e =>
      institution.courses.includes(e.courseId)
    )

    const completedCount = enrollmentEntries.filter(e => e.certificateEarned).length
    const totalRevenue = enrollmentEntries
      .filter(e => e.paid)
      .reduce((sum, e) => sum + e.amountPaid, 0)

    return {
      institutionId,
      name: institution.name,
      totalEnrollments: enrollmentEntries.length,
      completedCourses: completedCount,
      completionRate: Math.round((completedCount / enrollmentEntries.length) * 100),
      totalRevenue,
      averageRevenuePerStudent: enrollmentEntries.length > 0
        ? Math.round(totalRevenue / enrollmentEntries.length)
        : 0
    }
  },

  // ===== UTILITY =====
  reset: () => {
    set({
      playerProfile: {
        enrolledCourses: [],
        completedCourses: [],
        certificates: [],
        wallet: 0,
        totalSpent: 0
      },
      enrollments: {},
      uploadedVideos: {}
    })
  }
}))
