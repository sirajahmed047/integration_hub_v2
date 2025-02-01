import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const webhook = await request.json();
    
    // Ensure required fields are present
    const webhookData = {
      id: webhook.id || `WH-${Date.now()}`,
      name: webhook.name || 'Untitled Webhook',
      desc: webhook.desc || webhook.description || '',
      envizi_template: webhook.envizi_template || 'POC',
      endpoint: webhook.endpoint,
      method: webhook.method,
      headers: webhook.headers || {},
      envizi: webhook.envizi || {},
      mapping: webhook.mapping || []
    };

    const rootDir = path.join(process.cwd(), '..');
    
    // Save individual webhook file
    const webhookFilePath = path.join(rootDir, 'api', 'data-store', 'webhook', `webhook-${webhookData.id}.json`);
    await fs.writeFile(webhookFilePath, JSON.stringify(webhookData, null, 2));

    // Update main webhook list with required fields only
    const listFilePath = path.join(rootDir, 'api', 'data-store', 'webhook', 'webhook.json');
    const listData = await fs.readFile(listFilePath, 'utf8');
    const webhooks = JSON.parse(listData);
    
    // Create simplified webhook object for list
    const listWebhook = {
      id: webhookData.id,
      name: webhookData.name,
      desc: webhookData.desc,
      type: webhookData.envizi_template
    };
    
    // Update or add webhook to list
    const index = webhooks.findIndex((w: any) => w.id === webhookData.id);
    if (index >= 0) {
      webhooks[index] = listWebhook;
    } else {
      webhooks.push(listWebhook);
    }
    
    await fs.writeFile(listFilePath, JSON.stringify(webhooks));

    return NextResponse.json({
      success: true,
      message: 'Webhook saved successfully',
      data: webhookData
    });
    
  } catch (error) {
    console.error('Save webhook error:', error);
    return NextResponse.json(
      { success: false, error: "Failed to save webhook", details: (error as Error).message },
      { status: 500 }
    );
  }
} 