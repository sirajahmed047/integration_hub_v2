import React from 'react';
import '../styles/globals.css';
import '@carbon/styles/css/styles.css';
import { Toaster } from 'react-hot-toast';
//import AppHeader from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import { Metadata } from 'next';
import { Providers } from './providers';
import Link from 'next/link';

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
      <body>
        <ErrorBoundary>
          <Providers>
            <div className="container">
              {/* <AppHeader /> */}
              <main className="content-wrapper">
                {children}
              </main>
              <Toaster position="top-right" />
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
} 