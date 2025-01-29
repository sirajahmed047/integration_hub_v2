import React, { Component } from 'react';

class EnvUtility {
  // This is a server side method. Should not use "use client"
  getAPIUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  };

  getEnviziConfig = () => {
    if (!process.env.NEXT_PUBLIC_ENVIZI_API_URL || 
        !process.env.NEXT_PUBLIC_ENVIZI_API_KEY || 
        !process.env.NEXT_PUBLIC_ENVIZI_ORG_ID) {
      throw new Error('Missing required Envizi configuration');
    }

    return {
      apiUrl: process.env.NEXT_PUBLIC_ENVIZI_API_URL,
      apiKey: process.env.NEXT_PUBLIC_ENVIZI_API_KEY,
      orgId: process.env.NEXT_PUBLIC_ENVIZI_ORG_ID,
    };
  };

  getWebhookConfig = () => {
    return {
      timeout: parseInt(process.env.NEXT_PUBLIC_WEBHOOK_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.NEXT_PUBLIC_WEBHOOK_RETRY_ATTEMPTS || '3'),
    };
  };
}

export default EnvUtility;
