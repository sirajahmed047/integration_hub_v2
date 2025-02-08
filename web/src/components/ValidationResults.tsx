import React from 'react';
import { TemplateMapping } from '../types/webhook';

interface ValidationResultsProps {
  errors: string[];
  mappings?: TemplateMapping[];
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({ errors, mappings }) => {
  if (!errors || errors.length === 0) {
    return <div>No validation errors</div>;
  }

  return (
    <div className="validation-errors">
      <h4>Validation Errors</h4>
      <ul>
        {errors.map((error, index) => (
          <li key={index} style={{ color: 'red' }}>{error}</li>
        ))}
      </ul>
    </div>
  );
}; 