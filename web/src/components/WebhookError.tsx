import { InlineNotification } from '@carbon/react';

interface WebhookErrorProps {
  error: {
    type: 'api' | 'validation' | 'transformation';
    message: string;
  } | null;
  onClose: () => void;
}

export function WebhookError({ error, onClose }: WebhookErrorProps) {
  if (!error) return null;

  return (
    <InlineNotification
      kind="error"
      title="Error"
      subtitle={error.message}
      onClose={onClose}
    />
  );
} 