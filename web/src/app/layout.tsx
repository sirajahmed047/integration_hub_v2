import React from 'react';
import '../styles/globals.css';
import '../styles/theme.css';
import '@carbon/styles/css/styles.css';
import { Toaster } from 'react-hot-toast';
import AppHeader from '../components/AppHeader/AppHeader';
import ErrorBoundary from './components/ErrorBoundary';
import { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Integration Hub',
  description: 'Integration Hub Application',
};

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          <ErrorBoundary>
            <AppHeader />
            <main className="content-wrapper">
              {children}
            </main>
            <Toaster position="top-right" />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
} 