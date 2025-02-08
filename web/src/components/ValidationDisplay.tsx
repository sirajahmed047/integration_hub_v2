import React from 'react';
import { InlineNotification } from '@carbon/react';
import { ValidationResult } from '../types/webhook';

interface ValidationDisplayProps {
  validation: ValidationResult;
}

export const ValidationDisplay: React.FC<ValidationDisplayProps> = ({ validation }) => {
  return (
    <div className="validation-display">
      {validation.errors.map((error, index) => (
        <InlineNotification
          key={index}
          kind={error.severity === 'error' ? 'error' : 'warning'}
          title={error.field}
          subtitle={error.message}
          hideCloseButton
          lowContrast
        >
          {error.resolution && (
            <p className="resolution-hint">{error.resolution}</p>
          )}
        </InlineNotification>
      ))}
      
      {validation.isValid && (
        <InlineNotification
          kind="success"
          title="Validation Passed"
          subtitle="All fields are properly mapped"
          hideCloseButton
          lowContrast
        />
      )}
    </div>
  );
}; 