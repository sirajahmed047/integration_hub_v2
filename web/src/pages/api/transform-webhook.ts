import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { webhook_detail_data, webhook_execute_response } = req.body;
    const records = webhook_execute_response.records || [];

    // If no mappings are defined, return the raw records
    if (!webhook_detail_data.fields?.length) {
      return res.status(200).json({
        success: true,
        data: records,
        testMode: webhook_detail_data.isTestMode,
        originalData: webhook_execute_response,
        validationErrors: []
      });
    }

    // Transform the data based on the mapping
    const transformedData = records.map((record: any) => {
      const mappedRecord: Record<string, any> = {};
      webhook_detail_data.fields.forEach((mapping: any) => {
        const sourcePath = mapping.sourcePath.split('.');
        let value = record;
        
        for (const path of sourcePath) {
          value = value?.[path];
        }
        
        mappedRecord[mapping.enviziField] = value;
      });
      return mappedRecord;
    });

    return res.status(200).json({
      success: true,
      data: transformedData,
      processed_data: transformedData,
      testMode: webhook_detail_data.isTestMode,
      originalData: webhook_execute_response,
      validationErrors: []
    });
  } catch (error: any) {
    console.error('Transform error:', error);
    return res.status(500).json({ 
      error: 'Failed to transform data',
      details: error.message
    });
  }
} 