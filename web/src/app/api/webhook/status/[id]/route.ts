import { UnifiedWebhookService } from '../../../../../services/UnifiedWebhookService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const webhookService = new UnifiedWebhookService();
    const status = await webhookService.monitor(params.id);
    
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Status check failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 