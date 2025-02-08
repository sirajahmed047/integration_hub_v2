import React from 'react';
import { TextInput, Select, SelectItem } from '@carbon/react';
import { WebhookSetup } from '../types/webhook';

interface WebhookFormProps {
  config: WebhookSetup;
  onChange: (config: WebhookSetup) => void;
}

export const WebhookForm: React.FC<WebhookFormProps> = ({ config, onChange }) => {
  const handleChange = (field: keyof WebhookSetup['basicConfig'], value: string) => {
    onChange({
      ...config,
      basicConfig: {
        ...config.basicConfig,
        [field]: value
      }
    });
  };

  return (
    <div className="webhook-form">
      <TextInput
        id="webhook-name"
        labelText="Webhook Name"
        value={config.basicConfig.name}
        onChange={e => handleChange('name', e.target.value)}
        required
      />
      
      <TextInput
        id="webhook-endpoint"
        labelText="Endpoint URL"
        value={config.basicConfig.endpoint}
        onChange={e => handleChange('endpoint', e.target.value)}
        required
      />
      
      <Select
        id="webhook-method"
        labelText="HTTP Method"
        value={config.basicConfig.method}
        onChange={e => handleChange('method', e.target.value)}
      >
        <SelectItem value="GET" text="GET" />
        <SelectItem value="POST" text="POST" />
        <SelectItem value="PUT" text="PUT" />
        <SelectItem value="DELETE" text="DELETE" />
      </Select>
    </div>
  );
}; 