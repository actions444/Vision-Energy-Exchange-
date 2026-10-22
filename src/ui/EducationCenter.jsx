import React, { useState } from 'react'
import { useEducationSystem } from '../state/educationSystem'
import { EDUCATION_LEVELS, COURSE_CATEGORIES, ALL_COURSES } from '../config/educationalCourses'
import '../style/educationCenter.css'

export default function EducationCenter({ onClose }) {
  const education = useEducationSystem()
  const [view, setView] = useState('browse') // browse, course-detail, enroll, learning, certificates
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedEnrollment, setSelectedEnrollment] = useState(null)
  const [filterLevel, setFilterLevel] = useState(null)
  const [filterCategory, setFilterCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const stats = education.getPlayerStats()
  const allCourses = education.getAvailableCourses()

  // Filter courses
  const filteredCourses = allCourses.filter(course => {
    if (filterLevel && course.level !== filterLevel) return false
    if (filterCategory && course.category !== filterCategory) return false
    if (searchQuery && !course.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleEnroll = (courseId) => {
    const enrollmentId = education.enrollInCourse('player_1', courseId, 'You')
    if (enrollmentId) {
      setSelectedEnrollment(enrollmentId)
      setView('enroll')
    }
  }

  const handlePayment = (enrollmentId) => {
    const enrollment = education.getEnrollmentStatus(enrollmentId)
    education.payForCourse(enrollmentId, enrollment.price)
    setView('learning')
  }

  return (
    <div className="education-center-overlay">
      <div className="education-center-panel">
        {/* HEADER */}
        <div className="education-header">
          <div className="edu-title">
            <h1>🏫 Trinity Reign Academy</h1>
            <p>Premier Education in Trust Law & Entrepreneurship</p>
          </div>

          <div className="edu-stats">
            <div className="stat-card">
              <span className="stat-label">Enrolled</span>
              <span className="stat-value">{stats.enrolledCourses}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{stats.completedCourses}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Certificates</span>
              <span className="stat-value">{stats.certificates}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Wallet</span>
              <span className="stat-value">${(stats.wallet / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ===== BROWSE COURSES VIEW ===== */}
        {view === 'browse' && (
          <div className="education-view browse-view">
            <div className="filters-bar">
              <input
                type="text"
                className="search-box"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <select
                className="filter-select"
                value={filterLevel || ''}
                onChange={(e) => setFilterLevel(e.target.value || null)}
              >
                <option value="">All Levels</option>
                {Object.entries(EDUCATION_LEVELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <select
                className="filter-select"
                value={filterCategory || ''}
                onChange={(e) => setFilterCategory(e.target.value || null)}
              >
                <option value="">All Categories</option>
                {Object.entries(COURSE_CATEGORIES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="courses-grid">
              {filteredCourses.length > 0 ? (
                filteredCourses.map(course => (
                  <div key={course.id} className="course-card">
                    <div className="course-header">
                      <h3>{course.title}</h3>
                      <span className="course-level">{EDUCATION_LEVELS[course.level]}</span>
                    </div>

                    <p className="course-description">{course.description}</p>

                    <div className="course-info">
                      <span className="course-duration">
                        ⏱️ {course.duration} weeks
                      </span>
                      <span className="course-instructor">
                        👨‍🏫 {course.instructor}
                      </span>
                    </div>

                    <div className="course-price">
                      ${(course.price / 100).toFixed(2)}
                    </div>

                    <button
                      className="btn btn-primary-small"
                      onClick={() => {
                        setSelectedCourse(course)
                        setView('course-detail')
                      }}
                    >
                      View Details
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-courses">
                  <p>No courses found matching your filters</p>
                </div>
              )}
            </div>

            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {/* ===== COURSE DETAIL VIEW ===== */}
        {view === 'course-detail' && selectedCourse && (
          <div className="education-view course-detail-view">
            <button className="back-button" onClick={() => setView('browse')}>
              ← Back to Courses
            </button>

            <div className="course-detail-header">
              <div>
                <h2>{selectedCourse.title}</h2>
                <p className="level-badge">{EDUCATION_LEVELS[selectedCourse.level]}</p>
              </div>
              <div className="course-price-large">
                ${(selectedCourse.price / 100).toFixed(2)}
              </div>
            </div>

            <div className="course-meta">
              <div className="meta-item">
                <span className="meta-label">Duration:</span>
                <span>{selectedCourse.duration} weeks</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Instructor:</span>
                <span>{selectedCourse.instructor}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Category:</span>
                <span>{COURSE_CATEGORIES[selectedCourse.category]}</span>
              </div>
            </div>

            <div className="course-description-full">
              <h3>Course Overview</h3>
              <p>{selectedCourse.description}</p>
            </div>

            <div className="modules-list">
              <h3>📚 Course Modules</h3>
              {selectedCourse.modules.map((module, idx) => (
                <div key={module.id} className="module-item">
                  <span className="module-number">{idx + 1}</span>
                  <div className="module-content">
                    <h4>{module.title}</h4>
                    <p>{module.videos.length} videos • {module.videos.reduce((sum, v) => sum + v.duration, 0)} min total</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => handleEnroll(selectedCourse.id)}
            >
              Enroll in This Course
            </button>
          </div>
        )}

        {/* ===== ENROLLMENT/PAYMENT VIEW ===== */}
        {view === 'enroll' && selectedEnrollment && (() => {
          const enrollment = education.getEnrollmentStatus(selectedEnrollment)
          return (
            <div className="education-view enroll-view">
              <button className="back-button" onClick={() => setView('browse')}>
                ← Back to Courses
              </button>

              <div className="enrollment-card">
                <h2>✅ Successfully Enrolled!</h2>

                <div className="enrollment-details">
                  <div className="detail-row">
                    <span className="detail-label">Course:</span>
                    <span className="detail-value">{enrollment.courseName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">${(enrollment.price / 100).toFixed(2)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">
                      {enrollment.paid ? '✅ Paid' : '⏳ Unpaid'}
                    </span>
                  </div>
                </div>

                {!enrollment.paid && (
                  <div className="payment-section">
                    <h3>💳 Complete Your Payment</h3>
                    <p className="payment-info">
                      Pay ${(enrollment.price / 100).toFixed(2)} to access all course content
                    </p>
                    <p className="payment-note">
                      Your current wallet balance: ${(stats.wallet / 100).toFixed(2)}
                    </p>

                    {stats.wallet >= enrollment.price ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => handlePayment(selectedEnrollment)}
                      >
                        Pay Now & Start Learning
                      </button>
                    ) : (
                      <div className="payment-error">
                        ⚠️ Insufficient funds. You need ${((enrollment.price - stats.wallet) / 100).toFixed(2)} more.
                      </div>
                    )}
                  </div>
                )}

                {enrollment.paid && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedEnrollment(selectedEnrollment)
                      setView('learning')
                    }}
                  >
                    Go to Course Content
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* ===== LEARNING VIEW ===== */}
        {view === 'learning' && selectedEnrollment && (() => {
          const enrollment = education.getEnrollmentStatus(selectedEnrollment)
          const course = selectedCourse || education.getCourseDetails(enrollment.courseId)
          const progress = education.getStudentProgress(selectedEnrollment)

          return (
            <div className="education-view learning-view">
              <button className="back-button" onClick={() => setView('browse')}>
                ← Back to Courses
              </button>

              <div className="learning-header">
                <h2>{course.title}</h2>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress.progress}%` }}></div>
                </div>
                <p className="progress-text">
                  {progress.completedModules} of {progress.totalModules} modules completed
                </p>
              </div>

              <div className="modules-learning">
                {course.modules.map((module, idx) => {
                  const isCompleted = enrollment.completedModules.includes(module.id)
                  return (
                    <div key={module.id} className={`module-learning-card ${isCompleted ? 'completed' : ''}`}>
                      <div className="module-header">
                        <h3>Module {idx + 1}: {module.title}</h3>
                        <span className={`completion-badge ${isCompleted ? 'done' : 'pending'}`}>
                          {isCompleted ? '✅ Complete' : '⏳ In Progress'}
                        </span>
                      </div>

                      <div className="videos-in-module">
                        {module.videos.map((video) => (
                          <div key={video.id} className="video-item">
                            <span className="video-icon">▶️</span>
                            <div className="video-info">
                              <p className="video-title">{video.title}</p>
                              <p className="video-meta">
                                {video.duration} min • {video.instructor}
                              </p>
                            </div>
                            <button
                              className="btn btn-small"
                              onClick={() => education.recordVideoView(video.id)}
                            >
                              Watch
                            </button>
                          </div>
                        ))}
                      </div>

                      {!isCompleted && (
                        <button
                          className="btn btn-module-complete"
                          onClick={() => education.completeModule(selectedEnrollment, module.id)}
                        >
                          Mark Module Complete
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {progress.certificateEarned && (
                <div className="certificate-earned">
                  <h3>🎓 Certificate Earned!</h3>
                  <p>Congratulations! You've completed {course.title}</p>
                  <button className="btn btn-primary">
                    Download Certificate
                  </button>
                </div>
              )}
            </div>
          )
        })()}

        {/* ===== CERTIFICATES VIEW ===== */}
        {view === 'certificates' && (
          <div className="education-view certificates-view">
            <button className="back-button" onClick={() => setView('browse')}>
              ← Back to Courses
            </button>

            <h2>🎓 Your Certificates</h2>

            {stats.certificates > 0 ? (
              <div className="certificates-grid">
                {education.getAllCertificates().map((cert) => (
                  <div key={cert.certificateId} className="certificate-card">
                    <div className="certificate-header">
                      <h3>{cert.courseName}</h3>
                      <p className="cert-date">
                        Earned: {new Date(cert.dateEarned).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="certificate-details">
                      <p><strong>Instructor:</strong> {cert.instructorName}</p>
                      <p><strong>Issued by:</strong> Trinity Reign Academy</p>
                    </div>
                    <button className="btn btn-small">Download</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-certificates">
                <p>You haven't earned any certificates yet.</p>
                <p>Complete a course to earn your first certificate!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
