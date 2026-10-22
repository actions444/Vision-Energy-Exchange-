import { create } from 'zustand'

/**
 * Enhanced Education System
 *
 * 24/7 School with Student Scheduling
 * - Courses available any time
 * - Students create their own schedule based on availability
 * - PDF forms and materials delivered via email
 * - Progressive curriculum from elementary through professional
 * - Premium courses students must pay for
 */

export const useEnhancedEducationSystem = create((set, get) => ({
  students: {}, // studentId -> student profile
  enrollments: {}, // enrollmentId -> enrollment data
  schedules: {}, // scheduleId -> student schedule
  deliveredMaterials: {}, // studentId -> delivered materials
  courseOfferigns: {}, // courseId -> offering data

  // ===== STUDENT ENROLLMENT (WITH PAYMENT) =====
  enrollStudent: (studentId, courseId, paymentAmount) => {
    const student = get().students[studentId]
    if (!student) return null

    // Check if student has paid
    if (student.wallet < paymentAmount) {
      return { error: 'Insufficient funds', required: paymentAmount, available: student.wallet }
    }

    const enrollmentId = `enroll_${studentId}_${courseId}_${Date.now()}`

    set(state => ({
      // Deduct payment
      students: {
        ...state.students,
        [studentId]: {
          ...state.students[studentId],
          wallet: state.students[studentId].wallet - paymentAmount,
          enrollments: [
            ...(state.students[studentId].enrollments || []),
            enrollmentId
          ]
        }
      },
      // Create enrollment
      enrollments: {
        ...state.enrollments,
        [enrollmentId]: {
          enrollmentId,
          studentId,
          courseId,
          enrolled_at: new Date(),
          payment: paymentAmount,
          status: 'active',
          progress: 0,
          modules_completed: [],
          assignments_submitted: []
        }
      }
    }))

    // Generate and email course materials
    generateCourseMaterials(studentId, courseId, enrollmentId)

    return {
      success: true,
      enrollmentId,
      message: `Enrolled in course. Materials will be emailed.`
    }
  },

  // ===== CREATE STUDENT SCHEDULE =====
  createStudentSchedule: (studentId, preferences) => {
    const scheduleId = `schedule_${studentId}_${Date.now()}`

    set(state => ({
      schedules: {
        ...state.schedules,
        [scheduleId]: {
          scheduleId,
          studentId,
          timezone: preferences.timezone || 'America/Chicago',
          availability: preferences.availability || [],
          preferred_class_times: preferences.preferred_times || ['evenings', 'weekends'],
          class_duration_preference: preferences.duration || 60, // minutes
          days_available: preferences.days || 'all',
          start_date: new Date(),
          recurring: true,
          classes_assigned: [],
          created_at: new Date(),

          // Student notes what works for them
          notes: 'Student created schedule - not locked in, can change anytime'
        }
      }
    }))

    return scheduleId
  },

  // ===== ASSIGN CLASSES TO STUDENT'S SCHEDULE =====
  assignClassToSchedule: (scheduleId, courseId, enrollmentId) => {
    const schedule = get().schedules[scheduleId]
    if (!schedule) return null

    // Find available time slots based on student preferences
    const timeSlots = generateTimeSlots(schedule)

    set(state => ({
      schedules: {
        ...state.schedules,
        [scheduleId]: {
          ...schedule,
          classes_assigned: [
            ...schedule.classes_assigned,
            {
              classId: `class_${courseId}_${Date.now()}`,
              courseId,
              enrollmentId,
              assigned_times: timeSlots,
              status: 'scheduled'
            }
          ]
        }
      }
    }))

    return timeSlots
  },

  // ===== EMAIL DELIVERY OF COURSE MATERIALS =====
  emailCourseMaterials: (studentId, courseId, enrollmentId) => {
    const student = get().students[studentId]
    const course = get().courseOfferigns[courseId]
    if (!student || !course) return null

    const materials = {
      email_to: student.email || `${studentId}@visionstormsworld.com`,
      subject: `Welcome to ${course.title} - Course Materials Inside`,
      sent_at: new Date(),

      content: {
        greeting: `Welcome to ${course.title}!`,

        your_schedule: 'You can access classes anytime in the next ' + (course.duration || 'unlimited') + ' days',

        materials_included: [
          'PDF: Course Overview and Learning Objectives',
          'PDF: Module 1 - ' + (course.modules?.[0]?.title || 'Introduction'),
          'PDF: Module 2 - ' + (course.modules?.[1]?.title || 'Core Concepts'),
          'PDF: All downloadable forms and templates',
          'PDF: Resources and references',
          'Video links (access via your student portal)'
        ],

        how_to_access: [
          'Log into your student account',
          'Go to "My Courses"',
          'Select ' + course.title,
          'Download PDFs or watch videos anytime',
          'Complete assignments on your schedule'
        ],

        your_enrollment: {
          course: course.title,
          duration: course.duration + ' ' + (course.duration_unit || 'weeks'),
          level: course.level,
          instructor: course.instructor || 'NPC Instructor',
          enrollment_id: enrollmentId
        },

        support: 'Questions? Contact your instructor via the course portal. Available 24/7.'
      }
    }

    set(state => ({
      deliveredMaterials: {
        ...state.deliveredMaterials,
        [studentId]: {
          ...(state.deliveredMaterials[studentId] || {}),
          [courseId]: materials
        }
      }
    }))

    return materials
  },

  // ===== GENERATE PDF FORMS =====
  generatePDFForm: (courseId, formType) => {
    const forms = {
      // Financial forms
      form_1099_a: {
        name: '1099-A: Acquisition or Abandonment of Secured Property',
        fields: ['Property Address', 'Date of Abandonment', 'Full Sale Price', 'Amount Paid Down'],
        description: 'Track foreclosure or property abandonment events'
      },
      form_1099_b: {
        name: '1099-B: Proceeds from Broker Transactions',
        fields: ['Security Description', 'Quantity Sold', 'Sale Price', 'Cost Basis', 'Gain/Loss'],
        description: 'Report investment sales'
      },
      form_ein_application: {
        name: 'EIN Application Worksheet',
        fields: ['Business Name', 'Business Address', 'Business Type', 'Number of Employees'],
        description: 'Prepare for EIN application'
      },
      form_duns_register: {
        name: 'DUNS Registration Checklist',
        fields: ['Business Legal Name', 'Address', 'Phone', 'Industry Classification'],
        description: 'Steps to get your DUNS number'
      },
      form_banking_revelation: {
        name: 'Banking Numbers Reference Sheet',
        fields: ['Your Routing Number', 'Your Account Number', 'Account Type Code', 'Interest Rate They Pay'],
        description: 'Understand your bank account structure'
      },

      // Trust forms
      form_trust_creation: {
        name: 'Trust Creation Worksheet',
        fields: ['Trust Name', 'Trustee Name', 'Successor Trustee', 'Trust Assets'],
        description: 'Plan your trust structure'
      },
      form_trust_ein: {
        name: 'Trust EIN Application Guide',
        fields: ['Trust Name', 'EIN Purpose', 'Trust Type', 'Beneficiaries'],
        description: 'Get an EIN for your trust'
      },

      // Health forms
      form_std_prevention: {
        name: 'STD Prevention & Herbal Remedies Guide',
        fields: ['STD Type', 'Prevention Methods', 'Herbal Options', 'Professional Care'],
        description: 'Education and prevention reference'
      },

      // Labor forms
      form_union_organizing: {
        name: 'Union Organizing Checklist',
        fields: ['Workplace Issues', 'Union Contacts', 'Organizing Timeline', 'Action Steps'],
        description: 'Steps to organize a union'
      }
    }

    return forms[formType] || null
  },

  // ===== TRACK STUDENT PROGRESS =====
  updateStudentProgress: (enrollmentId, moduleCompleted) => {
    const enrollment = Object.values(get().enrollments).find(e => e.enrollmentId === enrollmentId)
    if (!enrollment) return null

    set(state => ({
      enrollments: {
        ...state.enrollments,
        [enrollmentId]: {
          ...enrollment,
          modules_completed: [
            ...enrollment.modules_completed,
            {
              module: moduleCompleted,
              completed_at: new Date()
            }
          ],
          progress: Math.round((enrollment.modules_completed.length + 1) / 10 * 100) // Assuming 10 modules
        }
      }
    }))
  },

  // ===== PREMIUM COURSE OFFERINGS =====
  addCourseOffering: (courseData) => {
    const courseId = `course_${Date.now()}`

    set(state => ({
      courseOfferigns: {
        ...state.courseOfferigns,
        [courseId]: {
          courseId,
          ...courseData,
          created_at: new Date(),
          status: 'available'
        }
      }
    }))

    return courseId
  },

  // ===== GET STUDENT PORTAL DASHBOARD =====
  getStudentDashboard: (studentId) => {
    const student = get().students[studentId]
    if (!student) return null

    const enrollments = student.enrollments?.map(eId => get().enrollments[eId]) || []
    const schedule = Object.values(get().schedules).find(s => s.studentId === studentId)

    return {
      student_name: student.name,
      wallet_balance: student.wallet,

      current_courses: enrollments.map(e => ({
        course_id: e.courseId,
        progress: e.progress,
        modules_completed: e.modules_completed.length,
        status: e.status
      })),

      schedule_info: schedule ? {
        timezone: schedule.timezone,
        availability: schedule.availability,
        assigned_classes: schedule.classes_assigned.length
      } : null,

      available_materials: get().deliveredMaterials[studentId] || {},

      next_class: schedule ? schedule.classes_assigned[0]?.assigned_times[0] : null
    }
  }
}))

// ===== HELPER FUNCTIONS =====

function generateTimeSlots(schedule) {
  const slots = []
  const days = schedule.days_available === 'all'
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    : schedule.days_available

  const times = schedule.preferred_class_times.includes('mornings')
    ? ['6:00 AM', '7:00 AM', '8:00 AM']
    : schedule.preferred_class_times.includes('evenings')
    ? ['6:00 PM', '7:00 PM', '8:00 PM']
    : ['2:00 PM', '3:00 PM', '4:00 PM']

  // Create weekly schedule
  days.forEach(day => {
    times.forEach(time => {
      slots.push({
        day,
        time,
        timezone: schedule.timezone,
        available: true
      })
    })
  })

  return slots
}

function generateCourseMaterials(studentId, courseId, enrollmentId) {
  // In a real system, this would:
  // 1. Generate PDFs from templates
  // 2. Package them together
  // 3. Send via email
  // 4. Store delivery record
  return {
    status: 'materials_generated',
    student_id: studentId,
    course_id: courseId,
    enrollment_id: enrollmentId,
    delivery_method: 'email',
    materials_ready: true
  }
}

export function initializeStudent(studentId, studentName, email, wallet = 1000) {
  // This would be called when student joins
  return {
    studentId,
    name: studentName,
    email,
    wallet,
    enrollments: [],
    created_at: new Date()
  }
}
