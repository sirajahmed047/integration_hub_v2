'use client';
import React, { Component } from 'react';

import axios from 'axios';
import EnvUtility from '../EnvUtility/EnvUtility';

export default class ApiUtility {
  constructor() {
    this.envUtility = new EnvUtility();
  }

  postRequest = (
    url,
    startCallBack,
    errorCallBack,
    sucesssCallBack,
    myPayload
  ) => {
    const headers = { 
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    };

    const baseUrl = this.envUtility.getAPIUrl();
    const fullUrl = `${baseUrl}${url}`;

    if (startCallBack) startCallBack();
    axios
      .post(fullUrl, myPayload, { headers })
      .then((response) => {
        sucesssCallBack(response.data);
      })
      .catch((error) => {
        if (errorCallBack) errorCallBack(error);
      });
  };

  async getRequest(url) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
}
