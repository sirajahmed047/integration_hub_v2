import { UnifiedWebhookService } from '../../../../../services/UnifiedWebhookService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const webhookService = new UnifiedWebhookService();
    const validationResult = await webhookService.validate(params.id);
    
    return new Response(JSON.stringify(validationResult), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Validation failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 