import { UnifiedWebhookService } from '../../../../services/UnifiedWebhookService';

export async function POST(request: Request) {
  try {
    const webhookService = new UnifiedWebhookService();
    const config = await request.json();
    const webhookId = await webhookService.setup(config);
    
    return new Response(JSON.stringify({ success: true, webhookId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Setup failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 