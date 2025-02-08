import React from 'react';
import { FileUploader, Select, SelectItem } from '@carbon/react';
import { WebhookSetup } from '../types/webhook';

interface TemplateSelectorProps {
  template: WebhookSetup['template'];
  availableTemplates: string[];
  onTemplateChange: (template: WebhookSetup['template']) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  template,
  availableTemplates,
  onTemplateChange
}) => {
  const handleFileUpload = (files: FileList | null) => {
    if (files && files[0]) {
      onTemplateChange({
        file: files[0]
      });
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    onTemplateChange({
      name: templateName
    });
  };

  return (
    <div className="template-selector">
      <Select
        id="template-select"
        labelText="Select Existing Template"
        value={template.name || ''}
        onChange={e => handleTemplateSelect(e.target.value)}
      >
        <SelectItem value="" text="Choose a template..." />
        {availableTemplates.map(name => (
          <SelectItem key={name} value={name} text={name} />
        ))}
      </Select>

      <div className="template-upload">
        <p>Or upload a new template:</p>
        <FileUploader
          accept={['.csv', '.xlsx']}
          buttonLabel="Upload template"
          filenameStatus="edit"
          labelDescription="Only .csv and .xlsx files are accepted"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}; 