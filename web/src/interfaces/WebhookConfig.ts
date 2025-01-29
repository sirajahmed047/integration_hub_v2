interface WebhookConfig {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  headers: {[key: string]: string};
  isTestMode?: boolean; // if true, the webhook will not be sent to the endpoint
  envizi: {
    apiKey: string;
    endpoint: string;
    organizationId: string;
  };
  mapping: {
    sourceField: string;
    targetField: string;
    transformation?: string;
  }[];
}

export default WebhookConfig;