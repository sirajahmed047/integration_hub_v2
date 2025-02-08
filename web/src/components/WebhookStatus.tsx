import React from 'react';
import {
  Tag,
  StructuredListWrapper,
  StructuredListRow,
  StructuredListCell,
  StructuredListBody
} from '@carbon/react';
import { WebhookStatus as WebhookStatusType } from '../types/webhook';

interface WebhookStatusProps {
  status: WebhookStatusType;
}

export const WebhookStatus: React.FC<WebhookStatusProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status.status) {
      case 'active': return 'green';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="webhook-status">
      <Tag type={getStatusColor()}>{status.status}</Tag>
      
      <StructuredListWrapper>
        <StructuredListBody>
          <StructuredListRow>
            <StructuredListCell>Last Execution</StructuredListCell>
            <StructuredListCell>
              {status.lastExecution?.timestamp.toLocaleString() || 'Never'}
            </StructuredListCell>
          </StructuredListRow>
          
          <StructuredListRow>
            <StructuredListCell>Success Rate</StructuredListCell>
            <StructuredListCell>
              {status.metrics.successRate.toFixed(2)}%
            </StructuredListCell>
          </StructuredListRow>
          
          <StructuredListRow>
            <StructuredListCell>Total Executions</StructuredListCell>
            <StructuredListCell>
              {status.metrics.totalExecutions}
            </StructuredListCell>
          </StructuredListRow>
          
          <StructuredListRow>
            <StructuredListCell>Average Processing Time</StructuredListCell>
            <StructuredListCell>
              {status.metrics.averageProcessingTime.toFixed(2)}ms
            </StructuredListCell>
          </StructuredListRow>
          
          {status.nextScheduledRun && (
            <StructuredListRow>
              <StructuredListCell>Next Scheduled Run</StructuredListCell>
              <StructuredListCell>
                {status.nextScheduledRun.toLocaleString()}
              </StructuredListCell>
            </StructuredListRow>
          )}
        </StructuredListBody>
      </StructuredListWrapper>
    </div>
  );
}; 