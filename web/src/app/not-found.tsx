import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '70vh',
      textAlign: 'center'
    }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link 
        href="/webhooks"
        style={{
          marginTop: '1rem',
          color: '#0f62fe',
          textDecoration: 'none'
        }}
      >
        Return to Home
      </Link>
    </div>
  );
} 