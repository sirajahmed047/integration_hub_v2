import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, method, headers, data } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log('Proxying request to:', url);
    console.log('Method:', method);
    console.log('Headers:', headers);
    
    const response = await axios({
      method: method || 'GET',
      url: url,
      headers: headers || {},
      ...(method === 'POST' ? { data: data || {} } : {}),
    });
    
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    return res.status(error.response?.status || 500).json({ 
      error: 'Failed to fetch data',
      details: error.message,
      response: error.response?.data
    });
  }
} 