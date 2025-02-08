from datetime import datetime

def apply_transformation(value, transformation):
    if not transformation:
        return value
        
    transform_type = transformation.get('type')
    try:
        if transform_type == 'date':
            return format_date(value, transformation.get('format'))
        elif transform_type == 'number':
            return format_number(value, transformation.get('format'))
        elif transform_type == 'text':
            return format_text(value, transformation.get('operation'))
        return value
    except Exception as e:
        print(f"Transformation error: {str(e)}")
        return value

def format_date(value, format=None):
    try:
        if not value:
            return None
        date_obj = datetime.strptime(str(value), format or '%Y-%m-%d')
        return date_obj.isoformat()
    except:
        return value

def format_number(value, format=None):
    try:
        if value is None:
            return None
        num = float(value)
        return round(num, 2) if format == 'round' else num
    except:
        return value

def format_text(value, operation=None):
    try:
        if value is None:
            return None
        if operation == 'uppercase':
            return str(value).upper()
        elif operation == 'lowercase':
            return str(value).lower()
        elif operation == 'trim':
            return str(value).strip()
        return value
    except:
        return value 