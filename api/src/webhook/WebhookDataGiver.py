import os
import logging
from xml.dom.minidom import Document 
from dotenv import load_dotenv
from flask import request, jsonify, send_file, Blueprint
import pandas as pd
from flask_cors import cross_origin
import json
import requests
import io
from datetime import datetime

from util.DateUtils import DateUtils
from util.FileUtil import FileUtil
from util.ConfigUtil import ConfigUtil
from util.DictionaryUtil import DictionaryUtil
from util.ExcelUtil import ExcelUtil

from CommonConstants import *
from webhook.utils.transform_utils import apply_transformation, format_date, format_number, format_text
from webhook.utils.validation_utils import validate_field_value

webhook_routes = Blueprint('webhook', __name__)

@webhook_routes.route('/api/webhook/templates', methods=['GET'])
@cross_origin()
def get_templates():
    try:
        # Get default template
        default_template = {
            "name": "Account_Setup_and_Data_Load_PM-C_template",
            "fields": get_template_fields("Account_Setup_and_Data_Load_PM-C_template"),
            "version": "1.0",
            "description": "Default PM-C template"
        }

        return jsonify({
            "success": True,
            "templates": [default_template]
        })

    except Exception as e:
        print(f"Error getting templates: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@webhook_routes.route('/api/webhook/templates/<template_name>', methods=['GET'])
@cross_origin()
def get_template_by_name(template_name):
    try:
        fields = get_template_fields(template_name)
        if not fields:
            return jsonify({
                "success": False,
                "error": f"Template {template_name} not found"
            }), 404

        template = {
            "name": template_name,
            "fields": fields,
            "version": "1.0",
            "description": "Default PM-C template" if template_name == "Account_Setup_and_Data_Load_PM-C_template" else f"Template {template_name}"
        }

        return jsonify({
            "success": True,
            "template": template
        })

    except Exception as e:
        print(f"Error getting template: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@webhook_routes.route('/api/webhook/proxy', methods=['POST'])
@cross_origin()
def proxy_request():
    try:
        data = request.get_json()
        target_url = data.get('url')
        method = data.get('method', 'GET')
        headers = data.get('headers', {})
        body = data.get('body')

        response = requests.request(
            method=method,
            url=target_url,
            headers=headers,
            json=body if method != 'GET' else None,
            verify=False
        )

        return jsonify({
            'success': True,
            'status': response.status_code,
            'data': response.json() if response.text else None
        })

    except Exception as e:
        print(f"Proxy request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@webhook_routes.route('/api/webhook/generate-excel', methods=['POST'])
@cross_origin()
def webhook_generate_excel():
    logging.info("welcome webhook_generate_excel...")
    
    try:
        payload = request.get_json()
        data = payload.get('data')
        template = payload.get('template')
        
        if not all([data, template]):
            return jsonify({
                "success": False,
                "error": "Missing required parameters"
            }), 400
        
        logging.info(f"Received data for Excel generation: {len(data)} records")
        logging.info(f"Using template: {template}")
        
        # Generate Excel file
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'output')
        os.makedirs(output_dir, exist_ok=True)
        file_name = f"envizi-data-{datetime.now().strftime('%Y-%m-%d-%H%M%S')}.xlsx"
        file_path = os.path.join(output_dir, file_name)
        
        logging.info(f"Will generate Excel file at: {file_path}")
        
        # Create Excel writer
        writer = pd.ExcelWriter(file_path, engine='xlsxwriter')
        
        # Write data to 'Data' sheet
        df_data = pd.DataFrame(data)
        df_data.to_excel(writer, sheet_name='Data', index=False)
        
        # Get template fields for validation
        template_fields = get_template_fields(template)
        
        # Validate data
        validation_errors = []
        for idx, record in enumerate(data):
            for field in template_fields:
                value = record.get(field['name'])
                if field['required'] and (value is None or value == ''):
                    validation_errors.append(f"Record {idx + 1}: Required field '{field['name']}' is missing")
                elif value is not None and value != '':
                    if field['type'] == 'date':
                        try:
                            pd.to_datetime(value)
                        except:
                            validation_errors.append(f"Record {idx + 1}: Invalid date format for '{field['name']}'")
                    elif field['type'] == 'number':
                        try:
                            float(value)
                        except:
                            validation_errors.append(f"Record {idx + 1}: Invalid number format for '{field['name']}'")
        
        # Write validation errors to 'Validation' sheet if any
        if validation_errors:
            df_validation = pd.DataFrame(validation_errors, columns=['Error'])
            df_validation.to_excel(writer, sheet_name='Validation', index=False)
        
        # Save and close
        writer.close()
        
        logging.info(f"Excel file generated successfully at {file_path}")
        
        # Return the Excel file
        with open(file_path, 'rb') as f:
            excel_data = f.read()
        
        # Clean up the temporary file
        os.remove(file_path)
        
        return send_file(
            io.BytesIO(excel_data),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=file_name
        )
        
    except Exception as e:
        logging.error(f"Error in webhook_generate_excel: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def get_template_fields(template_name):
    """Get fields for a template"""
    if template_name == "Account_Setup_and_Data_Load_PM-C_template":
        return [
            {"name": "Organization Link", "type": "string", "required": True},
            {"name": "Organization", "type": "string", "required": True},
            {"name": "Location", "type": "string", "required": True},
            {"name": "Location Ref", "type": "string", "required": False},
            {"name": "Account Style Link", "type": "string", "required": True},
            {"name": "Account Style Caption", "type": "string", "required": True},
            {"name": "Account Number", "type": "string", "required": True},
            {"name": "Record Start YYYY-MM-DD", "type": "date", "required": True},
            {"name": "Record End YYYY-MM-DD", "type": "date", "required": True},
            {"name": "Quantity", "type": "number", "required": True},
            {"name": "Total Cost", "type": "number", "required": False}
        ]
    return []