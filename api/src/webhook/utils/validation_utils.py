from datetime import datetime

def validate_field_value(value, fields, target_field):
    try:
        field_def = next((f for f in fields if f['name'] == target_field), None)
        if not field_def:
            return True

        # Check required fields
        if field_def.get('required') and (value is None or value == ''):
            return False

        # Skip validation if value is empty and not required
        if value is None or value == '':
            return True

        field_type = field_def.get('type', 'string')
        
        # Type validation
        if field_type == 'number':
            float(str(value))  # Try converting to float
        elif field_type == 'date':
            datetime.strptime(str(value), '%Y-%m-%d')
            
        # Additional validation rules
        validation = field_def.get('validation', {})
        if field_type == 'number':
            num_value = float(value)
            if 'min' in validation and num_value < validation['min']:
                return False
            if 'max' in validation and num_value > validation['max']:
                return False
        
        return True
        
    except Exception as e:
        print(f"Validation error for {target_field}: {str(e)}")
        return False 