import { Tag } from '@carbon/react';

type WebhookStatus = 'active' | 'inactive' | 'error' | 'running' | 'success';

interface WebhookStatusBadgeProps {
  status: WebhookStatus;
  lastRunStatus?: string;
}

export function WebhookStatusBadge({ status, lastRunStatus }: WebhookStatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return lastRunStatus === 'error' ? 'red' : 'green';
      case 'running':
        return 'blue';
      case 'inactive':
        return 'gray';
      case 'error':
        return 'red';
      case 'success':
        return 'green';
      default:
        return 'gray';
    }
  };

  const getStatusText = () => {
    if (status === 'active' && lastRunStatus === 'error') {
      return 'Active (Last Run Failed)';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Tag type={getStatusColor()}>
      {getStatusText()}
    </Tag>
  );
} 