import React from 'react';
import './info.scss';

export default function Info({ title, children }) {
  return (
    <div className="info-component">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}
