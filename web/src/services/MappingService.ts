import { 
  EnviziTemplate, 
  EnviziField, 
  TemplateMapping, 
  TransformationType
} from '../types/webhook';

export class MappingService {
  // Core mapping functionality
  suggestMappings(record: any, template: EnviziTemplate): TemplateMapping[] {
    if (!record || !template.fields.length) {
      return [];
    }

    const flatPaths = this.flattenObject(record);
    return template.fields.map(field => this.createMapping(field, flatPaths));
  }

  transformData(records: any[], mappings: TemplateMapping[], template: EnviziTemplate): any[] {
    if (!records.length || !mappings.length || !template.fields.length) {
      return [];
    }

    return records.map(record => this.transformRecord(record, mappings, template));
  }

  // Private helper methods
  private createMapping(field: EnviziField, paths: Record<string, any>): TemplateMapping {
    const bestMatch = this.findBestMatch(field.name, Object.keys(paths));
    
    // Get appropriate transformation based on field type
    let transformation: TransformationType | undefined;
    
    switch (field.type) {
      case 'date':
        transformation = {
          type: 'date',
          format: 'iso'
        };
        break;
      case 'number':
        transformation = {
          type: 'math',
          format: 'fixed2'
        };
        break;
      case 'string':
        transformation = {
          type: 'text',
          format: 'trim'
        };
        break;
    }
    
    return {
      enviziField: field.name,
      sourcePath: bestMatch || '',
      required: field.required,
      transformation: transformation,
      confidence: bestMatch ? this.calculateSimilarity(field.name, bestMatch) : 0
    };
  }

  private transformRecord(
    record: any, 
    mappings: TemplateMapping[], 
    template: EnviziTemplate
  ): Record<string, any> {
    const result: Record<string, any> = {};
    const flatRecord = this.flattenObject(record);

    for (const mapping of mappings) {
      const field = template.fields.find(f => f.name === mapping.enviziField);
      if (!field) continue;

      try {
        const value = mapping.manualValue || flatRecord[mapping.sourcePath];
        result[field.name] = this.transformValue(value, field.type, mapping.transformation);
      } catch (error) {
        console.warn(`Transform failed for ${field.name}:`, error);
        result[field.name] = null;
      }
    }

    return result;
  }

  private transformValue(
    value: any, 
    fieldType: EnviziField['type'], 
    transformation?: TransformationType
  ): any {
    if (value == null) return null;

    try {
      switch (fieldType) {
        case 'date':
          return new Date(value).toISOString();
        case 'number':
          const num = Number(value);
          return isNaN(num) ? null : Number(num.toFixed(2));
        default:
          return String(value).trim();
      }
    } catch {
      return null;
    }
  }

  private getDefaultTransformation(fieldType: EnviziField['type']): TransformationType | undefined {
    switch (fieldType) {
      case 'date':
        return { type: 'date', format: 'iso' };
      case 'number':
        return { type: 'math', format: 'fixed2' };
      default:
        return undefined;
    }
  }

  private findBestMatch(target: string, candidates: string[]): string | undefined {
    if (!candidates.length) return undefined;

    let bestMatch: string | undefined;
    let highestScore = 0;

    const normalizedTarget = this.normalizeString(target);
    
    // Common field mappings
    const commonMappings: Record<string, string[]> = {
      'organization': ['organization', 'org', 'company'],
      'location': ['location', 'area', 'pricearea', 'connectedarea', 'viaarea'],
      'account_number': ['accountnumber', 'account', 'accountid'],
      'record_start': ['startdate', 'start', 'hourdk', 'hourutc'],
      'record_end': ['enddate', 'end', 'hourdk', 'hourutc'],
      'quantity': ['quantity', 'amount', 'sharemwh'],
      'total_cost': ['cost', 'price', 'shareppm']
    };

    // Check for common mappings first
    for (const [key, aliases] of Object.entries(commonMappings)) {
      if (normalizedTarget.includes(key)) {
        for (const candidate of candidates) {
          const normalizedCandidate = this.normalizeString(candidate);
          if (aliases.some(alias => normalizedCandidate.includes(alias))) {
            const score = this.calculateSimilarity(normalizedTarget, normalizedCandidate);
            if (score > highestScore) {
              highestScore = score;
              bestMatch = candidate;
            }
          }
        }
      }
    }

    // If no common mapping found, try direct similarity matching
    if (!bestMatch) {
      for (const candidate of candidates) {
        const normalizedCandidate = this.normalizeString(candidate);
        const score = this.calculateSimilarity(normalizedTarget, normalizedCandidate);
        if (score > highestScore && score > 0.3) { // Minimum similarity threshold
          highestScore = score;
          bestMatch = candidate;
        }
      }
    }

    return bestMatch;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeString(str1);
    const norm2 = this.normalizeString(str2);

    // Check for exact match or containment
    if (norm1 === norm2) return 1;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

    // Calculate Levenshtein distance for remaining cases
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/(start|end)?(date|time)/g, 'date')
      .replace(/(amount|quantity|value)/g, 'quantity')
      .replace(/(cost|price|fee)/g, 'cost');
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) track[0][i] = i;
    for (let j = 0; j <= str2.length; j++) track[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1,
          track[j - 1][i] + 1,
          track[j - 1][i - 1] + indicator
        );
      }
    }
    
    return track[str2.length][str1.length];
  }

  private flattenObject(obj: any, prefix = ''): Record<string, any> {
    return Object.entries(obj || {}).reduce((acc: Record<string, any>, [key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(acc, this.flattenObject(value, newKey));
      } else {
        acc[newKey] = value;
      }
      
      return acc;
    }, {});
  }
} 