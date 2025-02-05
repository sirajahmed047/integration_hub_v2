import { Tile } from '@carbon/react';

interface MetricsProps {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalRecordsProcessed: number;
  lastExecutionTime?: string;
  averageExecutionTime?: number;
}

export function WebhookMetrics({
  totalExecutions,
  successfulExecutions,
  failedExecutions,
  totalRecordsProcessed,
  lastExecutionTime,
  averageExecutionTime
}: MetricsProps) {
  return (
    <div className="webhook-metrics">
      <h3>Execution Metrics</h3>
      <div className="metrics-grid">
        <Tile>
          <h4>Total Executions</h4>
          <p className="metric-value">{totalExecutions}</p>
        </Tile>
        <Tile>
          <h4>Success Rate</h4>
          <p className="metric-value">
            {totalExecutions > 0
              ? Math.round((successfulExecutions / totalExecutions) * 100)
              : 0}%
          </p>
        </Tile>
        <Tile>
          <h4>Failed Executions</h4>
          <p className="metric-value">{failedExecutions}</p>
        </Tile>
        <Tile>
          <h4>Records Processed</h4>
          <p className="metric-value">{totalRecordsProcessed}</p>
        </Tile>
        {lastExecutionTime && (
          <Tile>
            <h4>Last Execution</h4>
            <p className="metric-value">
              {new Date(lastExecutionTime).toLocaleString()}
            </p>
          </Tile>
        )}
        {averageExecutionTime && (
          <Tile>
            <h4>Avg. Execution Time</h4>
            <p className="metric-value">{averageExecutionTime}s</p>
          </Tile>
        )}
      </div>
    </div>
  );
} 