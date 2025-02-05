export class WebhookTemplateUtility {
  static createEmptyFields() {
    return [
      this.getFieldTemplate('organization', 'Organization'),
      this.getFieldTemplate('location', 'Location'),
      this.getFieldTemplate('account_style', 'Account Style Caption'),
      this.getFieldTemplate('account_number', 'Account Number'),
      this.getFieldTemplate('account_name', 'Account Name'),
      this.getFieldTemplate('start_date', 'Start Date'),
      this.getFieldTemplate('end_date', 'End Date'),
      this.getFieldTemplate('usage_amount', 'Usage Amount'),
      this.getFieldTemplate('usage_unit', 'Usage Unit'),
      this.getFieldTemplate('cost_amount', 'Cost Amount'),
      this.getFieldTemplate('cost_unit', 'Cost Unit'),
      this.getFieldTemplate('supplier', 'Supplier'),
      this.getFieldTemplate('reference', 'Reference'),
      this.getFieldTemplate('notes', 'Notes')
    ];
  }

  private static getFieldTemplate(name: string, label: string) {
    return {
      name,
      label,
      sourcePath: '',
      transformation: { type: 'direct' as const }
    };
  }
} 