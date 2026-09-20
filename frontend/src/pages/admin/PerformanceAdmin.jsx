import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2
} from 'lucide-react'
import {
  getCohortAnalytics,
  getGradingAnalytics,
  getGrowthRanking,
  getSubjectAnalytics
} from '../../services/analyticsService'

function PerformanceAdmin() {
  const cohort = getCohortAnalytics()
  const grading = getGradingAnalytics()
  const growth = getGrowthRanking()
  const subjects = getSubjectAnalytics()

  const strongestGrowth = growth[0]

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">INTELLIGENCE</p>
          <h1>Performance Intelligence</h1>
          <p>
            Track cohort performance, academic growth and assessment
            outcomes across CloudNest.
          </p>
        </div>
      </section>

      <section className="command-metrics">
        <article className="command-metric-card">
          <BarChart3 size={20} />
          <span>Cohort average</span>
          <strong>{cohort.average}%</strong>
          <small>Current academic performance</small>
        </article>

        <article className="command-metric-card">
          <CheckCircle2 size={20} />
          <span>Completion average</span>
          <strong>{cohort.completion}%</strong>
          <small>Student task completion</small>
        </article>

        <article className="command-metric-card">
          <ArrowUpRight size={20} />
          <span>Improving</span>
          <strong>{cohort.improving}</strong>
          <small>Students trending upward</small>
        </article>

        <article className="command-metric-card">
          <ArrowDownRight size={20} />
          <span>Declining</span>
          <strong>{cohort.declining}</strong>
          <small>Students needing attention</small>
        </article>
      </section>

      <section className="student-detail-grid">
        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">
                SUBJECT PERFORMANCE
              </p>
              <h2>Academic overview</h2>
            </div>

            <BookOpen size={20} />
          </div>

          <div className="subject-performance-list">
            {subjects.map((subject) => (
              <div key={subject.id}>
                <div>
                  <span>{subject.code}</span>
                  <strong>{subject.name}</strong>
                </div>

                <div>
                  <span>Class average</span>
                  <strong>{subject.average}%</strong>
                </div>

                <div>
                  <span>Graded average</span>
                  <strong>
                    {subject.gradedAverage === null
                      ? 'No grades'
                      : `${subject.gradedAverage}%`}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">
                ASSESSMENT OPERATIONS
              </p>
              <h2>Grading health</h2>
            </div>

            <CheckCircle2 size={20} />
          </div>

          <div className="performance-stat-stack">
            <div>
              <span>Total submissions</span>
              <strong>{grading.total}</strong>
            </div>

            <div>
              <span>Graded</span>
              <strong>{grading.graded}</strong>
            </div>

            <div>
              <span>Awaiting grading</span>
              <strong>{grading.pending}</strong>
            </div>

            <div>
              <span>Grading completion</span>
              <strong>{grading.completion}%</strong>
            </div>
          </div>
        </article>
      </section>

      {strongestGrowth && (
        <section className="performance-highlight">
          <Award size={24} />

          <div>
            <p className="control-eyebrow">
              STRONGEST GROWTH
            </p>
            <h2>{strongestGrowth.name}</h2>
            <p>
              Performance has changed by{' '}
              {strongestGrowth.growth > 0 ? '+' : ''}
              {strongestGrowth.growth}% with a current average of{' '}
              {strongestGrowth.average}%.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

export default PerformanceAdmin