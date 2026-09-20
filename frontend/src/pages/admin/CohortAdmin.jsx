import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Gauge,
  ShieldAlert,
  Users
} from 'lucide-react'
import {
  getCohortAnalytics,
  getGrowthRanking,
  getPerformanceRanking
} from '../../services/analyticsService'

function CohortAdmin() {
  const analytics = getCohortAnalytics()
  const performance = getPerformanceRanking()
  const growth = getGrowthRanking()

  return (
    <div>
      <section className="control-page-header">
        <div>
          <p className="control-eyebrow">
            COHORT INTELLIGENCE
          </p>

          <h1>Cohort Analytics</h1>

          <p>
            Understand class-wide academic health without exposing
            private student rankings to other students.
          </p>
        </div>
      </section>

      <section className="command-metrics">
        <article className="command-metric-card">
          <BarChart3 size={20} />
          <span>Academic average</span>
          <strong>{analytics.average}%</strong>
          <small>Across monitored students</small>
        </article>

        <article className="command-metric-card">
          <Gauge size={20} />
          <span>Completion</span>
          <strong>{analytics.completion}%</strong>
          <small>Average workload completion</small>
        </article>

        <article className="command-metric-card">
          <ArrowUpRight size={20} />
          <span>Improving</span>
          <strong>{analytics.improving}</strong>
          <small>Positive growth trend</small>
        </article>

        <article className="command-metric-card">
          <ShieldAlert size={20} />
          <span>High risk</span>
          <strong>{analytics.highRisk}</strong>
          <small>Require intervention</small>
        </article>
      </section>

      <section className="student-detail-grid">
        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">
                PERFORMANCE DISTRIBUTION
              </p>
              <h2>Student performance</h2>
            </div>

            <Users size={20} />
          </div>

          <div className="cohort-ranking-list">
            {performance.map((student) => (
              <div key={student.id}>
                <span>{student.name}</span>

                <div className="cohort-score">
                  <div className="student-progress-track">
                    <span
                      style={{
                        width: `${student.average}%`
                      }}
                    ></span>
                  </div>

                  <strong>{student.average}%</strong>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="student-detail-panel">
          <div className="command-panel-heading">
            <div>
              <p className="control-eyebrow">
                GROWTH SIGNALS
              </p>
              <h2>Performance movement</h2>
            </div>

            <Activity size={20} />
          </div>

          <div className="cohort-growth-list">
            {growth.map((student) => (
              <div key={student.id}>
                <span>{student.name}</span>

                <strong
                  className={
                    student.growth >= 0
                      ? 'growth-positive'
                      : 'growth-negative'
                  }
                >
                  {student.growth >= 0 ? (
                    <ArrowUpRight size={15} />
                  ) : (
                    <ArrowDownRight size={15} />
                  )}

                  {student.growth > 0 ? '+' : ''}
                  {student.growth}%
                </strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="cohort-risk-panel">
        <div>
          <span>Low risk</span>
          <strong>{analytics.lowRisk}</strong>
        </div>

        <div>
          <span>Medium risk</span>
          <strong>{analytics.mediumRisk}</strong>
        </div>

        <div>
          <span>High risk</span>
          <strong>{analytics.highRisk}</strong>
        </div>

        <div>
          <span>Overloaded</span>
          <strong>{analytics.overloaded}</strong>
        </div>
      </section>
    </div>
  )
}

export default CohortAdmin