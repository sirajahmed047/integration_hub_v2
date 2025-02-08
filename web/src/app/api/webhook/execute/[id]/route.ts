import { UnifiedWebhookService } from '../../../../../services/UnifiedWebhookService';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const webhookService = new UnifiedWebhookService();
    const executionResult = await webhookService.execute(params.id);
    
    return new Response(JSON.stringify(executionResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Execution failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 