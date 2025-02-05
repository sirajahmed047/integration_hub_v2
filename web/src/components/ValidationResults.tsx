import React from 'react';

interface ValidationResultsProps {
  errors?: string[];
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({ errors = [] }) => {
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