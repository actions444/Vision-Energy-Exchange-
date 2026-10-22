// Educational Courses System - Trust Law, Entrepreneurship, Business

export const EDUCATION_LEVELS = {
  elementary: 'Elementary School',
  middle_school: 'Middle School',
  high_school: 'High School',
  college: 'College/University',
  professional: 'Professional Certification'
}

export const COURSE_CATEGORIES = {
  trust_law: 'Trust Law & Estate Planning',
  entrepreneurship: 'Entrepreneurship',
  business_basics: 'Business Fundamentals',
  finance: 'Personal Finance',
  real_estate: 'Real Estate & Property',
  legal_basics: 'Legal Basics',
  accounting: 'Accounting & Bookkeeping',
  marketing: 'Marketing & Sales'
}

// ===== TRUST LAW COURSES =====
export const TRUST_LAW_COURSES = {
  trust_basics_101: {
    id: 'trust_basics_101',
    title: 'Introduction to Trusts',
    level: 'high_school',
    category: 'trust_law',
    duration: 4, // weeks
    price: 9900, // $99.00
    instructor: 'Trust Expert NPC',
    description: 'Learn what trusts are, why they matter, and basic concepts',
    modules: [
      {
        id: 'module_1',
        title: 'What is a Trust?',
        videos: [
          { id: 'vid_1', title: 'Trust Basics', duration: 12, instructor: 'Trinity Reign' },
          { id: 'vid_2', title: 'Why Use Trusts', duration: 15, instructor: 'Trust Expert' }
        ]
      },
      {
        id: 'module_2',
        title: 'Types of Trusts Overview',
        videos: [
          { id: 'vid_3', title: 'Revocable vs Irrevocable', duration: 18, instructor: 'Trinity Reign' },
          { id: 'vid_4', title: 'Living Trusts', duration: 14, instructor: 'Estate Lawyer' }
        ]
      },
      {
        id: 'module_3',
        title: 'Who Needs a Trust',
        videos: [
          { id: 'vid_5', title: 'Asset Protection', duration: 16, instructor: 'Trinity Reign' },
          { id: 'vid_6', title: 'Avoiding Probate', duration: 13, instructor: 'Trust Expert' }
        ]
      },
      {
        id: 'module_4',
        title: 'Getting Started',
        videos: [
          { id: 'vid_7', title: 'First Steps', duration: 17, instructor: 'Trinity Reign' },
          { id: 'vid_8', title: 'Choosing a Trustee', duration: 11, instructor: 'Estate Lawyer' }
        ]
      }
    ]
  },

  texas_living_trust_201: {
    id: 'texas_living_trust_201',
    title: 'Texas Revocable Living Trusts',
    level: 'college',
    category: 'trust_law',
    duration: 6,
    price: 19900,
    instructor: 'Trinity Reign',
    description: 'Deep dive into Texas revocable living trusts and setup process',
    modules: [
      {
        id: 'module_1',
        title: 'Texas Trust Laws & Requirements',
        videos: [
          { id: 'vid_1', title: 'Texas Property Code', duration: 20, instructor: 'Trinity Reign' },
          { id: 'vid_2', title: 'TX Specific Requirements', duration: 18, instructor: 'TX Attorney' },
          { id: 'vid_3', title: 'Probate Avoidance in TX', duration: 16, instructor: 'Trinity Reign' }
        ]
      },
      {
        id: 'module_2',
        title: 'Setting Up Your Living Trust',
        videos: [
          { id: 'vid_4', title: 'Creating the Trust Document', duration: 22, instructor: 'Trinity Reign' },
          { id: 'vid_5', title: 'Funding Your Trust', duration: 25, instructor: 'TX Attorney' },
          { id: 'vid_6', title: 'Title Transfer Process', duration: 19, instructor: 'Trinity Reign' }
        ]
      },
      {
        id: 'module_3',
        title: 'Trust Bank Accounts & Financial Assets',
        videos: [
          { id: 'vid_7', title: 'Opening Trust Bank Accounts', duration: 17, instructor: 'Bank Officer NPC' },
          { id: 'vid_8', title: 'Getting an EIN Number', duration: 14, instructor: 'Trinity Reign' },
          { id: 'vid_9', title: 'Trust vs Personal Finances', duration: 18, instructor: 'CPA NPC' }
        ]
      },
      {
        id: 'module_4',
        title: 'Operating Through Your Trust',
        videos: [
          { id: 'vid_10', title: 'Daily Trust Operations', duration: 20, instructor: 'Trinity Reign' },
          { id: 'vid_11', title: 'Business Ownership in Trust', duration: 22, instructor: 'Business Lawyer' },
          { id: 'vid_12', title: 'Real Estate in Trust', duration: 19, instructor: 'Trinity Reign' }
        ]
      },
      {
        id: 'module_5',
        title: 'Asset Protection Strategies',
        videos: [
          { id: 'vid_13', title: 'What Trusts Protect', duration: 21, instructor: 'Trinity Reign' },
          { id: 'vid_14', title: 'Liability & Creditors', duration: 18, instructor: 'Asset Protection Expert' },
          { id: 'vid_15', title: 'Tax Implications', duration: 20, instructor: 'CPA NPC' }
        ]
      },
      {
        id: 'module_6',
        title: 'Advanced Trust Topics',
        videos: [
          { id: 'vid_16', title: 'Successor Trustees', duration: 16, instructor: 'Trinity Reign' },
          { id: 'vid_17', title: 'Trust Amendments', duration: 14, instructor: 'TX Attorney' },
          { id: 'vid_18', title: 'Your Trust Review Checklist', duration: 12, instructor: 'Trinity Reign' }
        ]
      }
    ]
  },

  trust_types_301: {
    id: 'trust_types_301',
    title: 'Comprehensive Trust Types & Strategies',
    level: 'college',
    category: 'trust_law',
    duration: 8,
    price: 29900,
    instructor: 'Estate Planning Expert',
    description: 'Learn all trust types: revocable, irrevocable, living, testamentary, and more',
    modules: [
      {
        id: 'module_1',
        title: 'Revocable Living Trusts',
        videos: [
          { id: 'vid_1', title: 'RLT Fundamentals', duration: 20 },
          { id: 'vid_2', title: 'Creating Your RLT', duration: 22 },
          { id: 'vid_3', title: 'RLT Funding Strategies', duration: 18 }
        ]
      },
      {
        id: 'module_2',
        title: 'Irrevocable Trusts',
        videos: [
          { id: 'vid_4', title: 'When to Use Irrevocable', duration: 19 },
          { id: 'vid_5', title: 'Irrevocable Trust Types', duration: 21 },
          { id: 'vid_6', title: 'ILIT, GRAT, GRUT Explained', duration: 23 }
        ]
      },
      {
        id: 'module_3',
        title: 'Special Purpose Trusts',
        videos: [
          { id: 'vid_7', title: 'Testamentary Trusts', duration: 17 },
          { id: 'vid_8', title: 'Spendthrift Trusts', duration: 18 },
          { id: 'vid_9', title: 'Special Needs Trusts', duration: 20 }
        ]
      },
      {
        id: 'module_4',
        title: 'Business & Property Trusts',
        videos: [
          { id: 'vid_10', title: 'Holding Business in Trust', duration: 22 },
          { id: 'vid_11', title: 'Real Estate Trusts', duration: 19 },
          { id: 'vid_12', title: 'Land Trust Strategies', duration: 21 }
        ]
      },
      {
        id: 'module_5',
        title: 'Tax-Advantaged Trusts',
        videos: [
          { id: 'vid_13', title: 'Charitable Remainder Trusts', duration: 23 },
          { id: 'vid_14', title: 'Dynasty Trusts', duration: 21 },
          { id: 'vid_15', title: 'Tax Planning with Trusts', duration: 24 }
        ]
      },
      {
        id: 'module_6',
        title: 'State-Specific Trust Laws',
        videos: [
          { id: 'vid_16', title: 'Texas Trusts', duration: 20 },
          { id: 'vid_17', title: 'Multi-State Trusts', duration: 19 },
          { id: 'vid_18', title: 'Asset Protection States', duration: 18 }
        ]
      },
      {
        id: 'module_7',
        title: 'Trust Administration',
        videos: [
          { id: 'vid_19', title: 'Trustee Responsibilities', duration: 21 },
          { id: 'vid_20', title: 'Managing Trust Assets', duration: 22 },
          { id: 'vid_21', title: 'Trust Accounting', duration: 20 }
        ]
      },
      {
        id: 'module_8',
        title: 'Advanced Strategies',
        videos: [
          { id: 'vid_22', title: 'Trust Protector Role', duration: 19 },
          { id: 'vid_23', title: 'Decanting & Modification', duration: 18 },
          { id: 'vid_24', title: 'Your Complete Trust Plan', duration: 17 }
        ]
      }
    ]
  },

  ein_business_setup_150: {
    id: 'ein_business_setup_150',
    title: 'Getting Your EIN & Trust Bank Accounts',
    level: 'high_school',
    category: 'business_basics',
    duration: 2,
    price: 4900,
    instructor: 'Business Setup Expert',
    description: 'Quick course on getting EIN numbers and opening trust bank accounts',
    modules: [
      {
        id: 'module_1',
        title: 'EIN Numbers Explained',
        videos: [
          { id: 'vid_1', title: 'What is an EIN?', duration: 8 },
          { id: 'vid_2', title: 'Who Needs an EIN?', duration: 10 },
          { id: 'vid_3', title: 'Why Trust EINs Matter', duration: 9 }
        ]
      },
      {
        id: 'module_2',
        title: 'Getting Your EIN',
        videos: [
          { id: 'vid_4', title: 'EIN Application Process', duration: 12 },
          { id: 'vid_5', title: 'IRS Form SS-4 Guide', duration: 14 },
          { id: 'vid_6', title: 'Getting EIN Online (Fast)', duration: 11 }
        ]
      },
      {
        id: 'module_3',
        title: 'Trust Bank Accounts',
        videos: [
          { id: 'vid_7', title: 'Opening Account as Trustee', duration: 13 },
          { id: 'vid_8', title: 'Documentation Required', duration: 10 },
          { id: 'vid_9', title: 'Bank Account Best Practices', duration: 12 }
        ]
      }
    ]
  }
}

// ===== ENTREPRENEURSHIP COURSES =====
export const ENTREPRENEURSHIP_COURSES = {
  become_entrepreneur_101: {
    id: 'become_entrepreneur_101',
    title: 'How to Become an Entrepreneur',
    level: 'high_school',
    category: 'entrepreneurship',
    duration: 5,
    price: 12900,
    instructor: 'Entrepreneur Coach NPC',
    description: 'Complete guide to starting your entrepreneurial journey',
    modules: [
      {
        id: 'module_1',
        title: 'Mindset & Fundamentals',
        videos: [
          { id: 'vid_1', title: 'What is an Entrepreneur?', duration: 15 },
          { id: 'vid_2', title: 'Entrepreneurial Mindset', duration: 18 },
          { id: 'vid_3', title: 'Common Myths', duration: 12 }
        ]
      },
      {
        id: 'module_2',
        title: 'Your Business Idea',
        videos: [
          { id: 'vid_4', title: 'Finding Your Niche', duration: 16 },
          { id: 'vid_5', title: 'Validating Your Idea', duration: 19 },
          { id: 'vid_6', title: 'Market Research Basics', duration: 14 }
        ]
      },
      {
        id: 'module_3',
        title: 'Business Fundamentals',
        videos: [
          { id: 'vid_7', title: 'Business Models', duration: 17 },
          { id: 'vid_8', title: 'Revenue Streams', duration: 15 },
          { id: 'vid_9', title: 'Startup Costs', duration: 13 }
        ]
      },
      {
        id: 'module_4',
        title: 'Legal & Structure',
        videos: [
          { id: 'vid_10', title: 'Business Entities (LLC, Corp, etc)', duration: 20 },
          { id: 'vid_11', title: 'Registering Your Business', duration: 16 },
          { id: 'vid_12', title: 'Licenses & Permits', duration: 14 }
        ]
      },
      {
        id: 'module_5',
        title: 'Your First Steps',
        videos: [
          { id: 'vid_13', title: 'Creating Your Plan', duration: 18 },
          { id: 'vid_14', title: 'Getting Started This Month', duration: 15 },
          { id: 'vid_15', title: 'First Year Checklist', duration: 17 }
        ]
      }
    ]
  },

  complete_business_101: {
    id: 'complete_business_101',
    title: 'Complete Business Setup & Operation',
    level: 'college',
    category: 'business_basics',
    duration: 10,
    price: 39900,
    instructor: 'Business Advisor NPC',
    description: 'Everything you need to start and run a successful business',
    modules: [
      {
        id: 'module_1',
        title: 'Business Planning',
        videos: [
          { id: 'vid_1', title: 'Business Plan Structure', duration: 22 },
          { id: 'vid_2', title: 'Executive Summary', duration: 18 },
          { id: 'vid_3', title: 'Financial Projections', duration: 25 }
        ]
      },
      {
        id: 'module_2',
        title: 'Legal Structure & Registration',
        videos: [
          { id: 'vid_4', title: 'Sole Proprietorship vs LLC', duration: 20 },
          { id: 'vid_5', title: 'Corporation Basics', duration: 19 },
          { id: 'vid_6', title: 'Business Registration Process', duration: 17 },
          { id: 'vid_7', title: 'EIN & Tax ID Numbers', duration: 16 }
        ]
      },
      {
        id: 'module_3',
        title: 'Financial Setup',
        videos: [
          { id: 'vid_8', title: 'Business Bank Account', duration: 14 },
          { id: 'vid_9', title: 'Bookkeeping Basics', duration: 21 },
          { id: 'vid_10', title: 'Understanding Your Numbers', duration: 23 },
          { id: 'vid_11', title: 'Taxes for Business Owners', duration: 20 }
        ]
      },
      {
        id: 'module_4',
        title: 'Asset Protection',
        videos: [
          { id: 'vid_12', title: 'Operating Through a Trust', duration: 24 },
          { id: 'vid_13', title: 'Business Trusts', duration: 22 },
          { id: 'vid_14', title: 'Insurance for Your Business', duration: 19 }
        ]
      },
      {
        id: 'module_5',
        title: 'Sales & Marketing',
        videos: [
          { id: 'vid_15', title: 'Marketing Basics', duration: 21 },
          { id: 'vid_16', title: 'Digital Marketing', duration: 23 },
          { id: 'vid_17', title: 'Sales Strategies', duration: 20 }
        ]
      },
      {
        id: 'module_6',
        title: 'Operations & Scaling',
        videos: [
          { id: 'vid_18', title: 'Day-to-Day Operations', duration: 19 },
          { id: 'vid_19', title: 'Building a Team', duration: 22 },
          { id: 'vid_20', title: 'Scaling Your Business', duration: 24 }
        ]
      },
      {
        id: 'module_7',
        title: 'Customer Service',
        videos: [
          { id: 'vid_21', title: 'Building Customer Relationships', duration: 18 },
          { id: 'vid_22', title: 'Handling Complaints', duration: 16 },
          { id: 'vid_23', title: 'Loyalty Programs', duration: 15 }
        ]
      },
      {
        id: 'module_8',
        title: 'Advanced Topics',
        videos: [
          { id: 'vid_24', title: 'Funding Your Business', duration: 25 },
          { id: 'vid_25', title: 'Selling Your Business', duration: 22 },
          { id: 'vid_26', title: 'Creating Passive Income', duration: 23 }
        ]
      },
      {
        id: 'module_9',
        title: 'Digital Products',
        videos: [
          { id: 'vid_27', title: 'Creating Digital Products', duration: 21 },
          { id: 'vid_28', title: 'Course Creation', duration: 26 },
          { id: 'vid_29', title: 'Passive Income Streams', duration: 20 }
        ]
      },
      {
        id: 'module_10',
        title: 'Your Business Action Plan',
        videos: [
          { id: 'vid_30', title: '90-Day Business Plan', duration: 19 },
          { id: 'vid_31', title: 'First Year Roadmap', duration: 21 },
          { id: 'vid_32', title: 'Success Metrics & Goals', duration: 18 }
        ]
      }
    ]
  }
}

// Combine all courses
export const ALL_COURSES = {
  ...TRUST_LAW_COURSES,
  ...ENTREPRENEURSHIP_COURSES
}

// ===== HELPER FUNCTIONS =====
export function getCourseById(courseId) {
  return ALL_COURSES[courseId]
}

export function getCoursesByLevel(level) {
  return Object.values(ALL_COURSES).filter(course => course.level === level)
}

export function getCoursesByCategory(category) {
  return Object.values(ALL_COURSES).filter(course => course.category === category)
}

export function getCoursesForPrice(maxPrice) {
  return Object.values(ALL_COURSES).filter(course => course.price <= maxPrice)
}

export function getAllCourses() {
  return Object.values(ALL_COURSES)
}

export function getCourseProgress(courseId, completedModules) {
  const course = getCourseById(courseId)
  if (!course) return 0
  return Math.round((completedModules.length / course.modules.length) * 100)
}
