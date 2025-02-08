import os
import logging
from xml.dom.minidom import Document 
from dotenv import load_dotenv
from flask import request, jsonify
import pandas as pd
from flask_cors import cross_origin
from flask import Blueprint
import json

import logging 
import os, json

from util.DateUtils import DateUtils
from util.FileUtil import FileUtil
from util.ConfigUtil import ConfigUtil
from util.DictionaryUtil import DictionaryUtil
from util.ExcelUtil import ExcelUtil

from CommonConstants import *
from webhook.utils.transform_utils import apply_transformation, format_date, format_number, format_text
from webhook.utils.validation_utils import validate_field_value

webhook_routes = Blueprint('webhook', __name__)

class WebhookDataGiver:
    # Class level constants
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    TEMPLATE_DIR = os.path.join(BASE_DIR, 'data-store', 'templates')
    TEMP_UPLOAD_DIR = os.path.join(BASE_DIR, 'tmp', 'webhook_uploads')

    def __init__(self) -> None:
        load_dotenv()
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(os.environ.get('LOGLEVEL', 'INFO').upper())
        self.excelUtil = ExcelUtil()
        
        # Ensure directories exist
        os.makedirs(self.TEMPLATE_DIR, exist_ok=True)
        os.makedirs(self.TEMP_UPLOAD_DIR, exist_ok=True)
        
        # Create templates.json if it doesn't exist
        template_file = os.path.join(self.TEMPLATE_DIR, 'templates.json')
        if not os.path.exists(template_file):
            with open(template_file, 'w') as f:
                json.dump([], f)

    def _load_templates(self):
        """Load templates from the template directory"""
        try:
            template_file = os.path.join(self.TEMPLATE_DIR, 'templates.json')
            with open(template_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Error loading templates: {str(e)}")
            return []

    def _getJsonDataType1(self, name, label):
        myData = {}
        myData["id"] = 0
        myData["name"] = name
        myData["label"] = label
        myData["type"] = 1
        myData["text_value"] = ""
        myData["map_value"] = ""
        myData["list"] = []
        return myData
    
    def _getJsonDataType2(self, name, label, default_value):
        myData = {}
        myData["id"] = 0
        myData["name"] = name
        myData["label"] = label
        myData["type"] = 2
        myData["text_value"] = default_value
        myData["map_value"] = ""
        myData["list"] = self._getJsonDataType4()
        return myData
    
    def _getJsonDataType3(self, name, label, list_elements):
        myData = {}
        myData["id"] = 0
        myData["name"] = name
        myData["label"] = label
        myData["type"] = 3
        myData["text_value"] = ""
        myData["list_value"] = ""
        myData["map_value"] = ""
        myData["list_elements"] = list_elements      
        myData["list"] = self._getJsonDataType4()
        return myData

    def _getJsonDataType4(self):
        myData = {}
        myData["id"] = 0
        myData["text_value"] = ""
        myData["map_value"] = ""
        myData["operation_value"] = ""
        myData["operation_elements"] = ['Append', '+', '-', '*', '/']

        list = []
        list.append(myData)

        return list

    def generateEmptyData(self, locations, accounts):
        myData = {}
        myData["id"] = ""
        myData["name"] = ""
        myData["desc"] = ""

        myData["http_method_list"] = ['GET', 'POST']
        myData["http_method"] = "POST"

        # Load templates dynamically from template directory
        templates = self._load_templates()
        myData["envizi_template_list"] = [t["name"] for t in templates]
        myData["envizi_template"] = ""  # Empty by default

        myData["data_template_type_list"] = ['1-single', '2-multiple', '3-multiple-and-common']
        myData["data_template_type"] = "2-multiple"
       
        myData["multiple_records_field"] = ""
    
        fieldsList = self._generateFieldsFromTemplate(locations, accounts)
        myData["fields"] = fieldsList

        return myData
    

    def populateFields(self, payload, locations, accounts) : 
        
        envizi_template = payload["envizi_template"]
        fieldsList = []
        if (envizi_template == "POC") :
            fieldsList = self._generateFieldsFromTemplate(locations, accounts)
        elif (envizi_template == "ASDL-PMC") :
             fieldsList = self._generateFieldsFromTemplate(locations, accounts)
        else  :
             payload["envizi_template"] = "POC"
             fieldsList = self._generateFieldsFromTemplate(locations, accounts)

        payload["fields"] = fieldsList

    def _generateFieldsFromTemplate(self, locations, accounts):
        try:
            with open('../data-store/templates/templates.json', 'r') as f:
                templates = json.load(f)
                template = next((t for t in templates if t["name"] == self.envizi_template), None)
                if template:
                    return [self._createFieldFromDefinition(field, locations, accounts) 
                           for field in template["fields"]]
        except Exception as e:
            self.logger.error(f"Error generating fields from template: {str(e)}")
            return []

    def _createFieldFromDefinition(self, field_def, locations, accounts):
        if field_def["name"] == "location":
            return self._getJsonDataType3('location', 'Location', locations)
        elif field_def["name"] == "account_name":
            return self._getJsonDataType3('account_name', 'Account Number', accounts)
        else:
            return self._getJsonDataType2(
                field_def["name"],
                field_def["label"],
                field_def.get("default_value", "")
            )

    @staticmethod
    @webhook_routes.route('/api/webhook/parse-template', methods=['POST'])
    @cross_origin()
    def parse_template():
        try:
            print("Starting template parse...")
            if 'file' not in request.files:
                return jsonify({'error': 'No file part', 'success': False}), 400
            
            file = request.files['file']
            temp_path = os.path.join(WebhookDataGiver.TEMP_UPLOAD_DIR, file.filename)
            
            try:
                file.save(temp_path)
                print(f"Reading file {file.filename}")
                
                df = pd.read_excel(temp_path) if file.filename.endswith(('.xlsx', '.xls')) else pd.read_csv(temp_path)
                
                headers = df.columns.tolist()
                sample_data = df.head(1).to_dict('records')
                print(f"Headers found: {headers}")

                fields = [{
                    'name': header,
                    'type': 'string',
                    'required': False,
                    'label': header.replace('_', ' ').title()
                } for header in headers]

                return jsonify({
                    'success': True,
                    'fields': fields,
                    'headers': headers,
                    'sampleData': sample_data,
                    'templateName': file.filename.split('.')[0]
                })

            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)

        except Exception as e:
            print(f"Template parsing error: {str(e)}")
            return jsonify({'error': str(e), 'success': False}), 500

    @staticmethod
    @webhook_routes.route('/api/webhook/test', methods=['POST'])
    @cross_origin()
    def test_webhook():
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file part', 'success': False}), 400
                
            file = request.files['file']
            webhook_data = request.form.get('webhook_detail_data')
            
            temp_path = os.path.join(WebhookDataGiver.TEMP_UPLOAD_DIR, file.filename)
            try:
                file.save(temp_path)
                df = pd.read_excel(temp_path) if file.filename.endswith(('.xlsx', '.xls')) else pd.read_csv(temp_path)
                records = df.to_dict('records')
                
                return jsonify({
                    'success': True,
                    'originalData': records,
                    'records': records,
                    'transformedData': [],
                    'validationErrors': []
                })
                
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
        except Exception as e:
            print(f"Error in test webhook: {str(e)}")
            return jsonify({'error': str(e), 'success': False}), 500

    def map_webhook_data(self, webhook_data, template_fields, mappings):
        try:
            transformed_data = []
            validation_errors = []
            
            for record in webhook_data:
                transformed_record = {}
                
                for mapping in mappings:
                    source_value = self.get_nested_value(record, mapping['sourcePath'])
                    
                    # Apply transformation
                    transformed_value = apply_transformation(
                        source_value, 
                        mapping.get('transformation')
                    )
                    
                    # Validate
                    if not validate_field_value(
                        transformed_value, 
                        template_fields, 
                        mapping['enviziField']
                    ):
                        validation_errors.append(
                            f"Invalid value for {mapping['enviziField']}"
                        )
                    
                    transformed_record[mapping['enviziField']] = transformed_value
                    
                transformed_data.append(transformed_record)
                
            return {
                'transformedData': transformed_data,
                'validationErrors': validation_errors
            }
        except Exception as e:
            raise Exception(f"Mapping error: {str(e)}")

    @staticmethod
    @webhook_routes.route('/api/webhook/templates', methods=['GET'])
    @cross_origin()
    def get_templates():
        try:
            # Get default template
            default_template = {
                "name": "Account_Setup_and_Data_Load_PM-C_template",
                "fields": [
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
                ],
                "version": "1.0",
                "description": "Default PM-C template"
            }

            # Load custom templates from file system
            templates_dir = WebhookDataGiver.TEMPLATE_DIR
            custom_templates = []
            
            if os.path.exists(templates_dir):
                for filename in os.listdir(templates_dir):
                    if filename.endswith('.json'):
                        try:
                            with open(os.path.join(templates_dir, filename), 'r') as f:
                                template = json.load(f)
                                custom_templates.append(template)
                        except Exception as e:
                            print(f"Error reading template {filename}: {str(e)}")

            # Combine default and custom templates
            all_templates = [default_template] + custom_templates

            return jsonify({
                "success": True,
                "templates": all_templates
            })

        except Exception as e:
            print(f"Error getting templates: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500

    @staticmethod
    @webhook_routes.route('/api/webhook/templates/<template_name>', methods=['GET'])
    @cross_origin()
    def get_template_by_name(template_name):
        try:
            # Get default template structure
            default_template = {
                "name": "Account_Setup_and_Data_Load_PM-C_template",
                "fields": [
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
                ],
                "version": "1.0",
                "description": "Default PM-C template"
            }

            # If requesting the default template, return it
            if template_name == "Account_Setup_and_Data_Load_PM-C_template":
                return jsonify({
                    "success": True,
                    "template": default_template
                })

            # Otherwise, try to load from file system
            templates_dir = WebhookDataGiver.TEMPLATE_DIR
            template_path = os.path.join(templates_dir, f"{template_name}.json")
            
            if os.path.exists(template_path):
                try:
                    with open(template_path, 'r') as f:
                        template = json.load(f)
                        return jsonify({
                            "success": True,
                            "template": template
                        })
                except Exception as e:
                    print(f"Error reading template {template_name}: {str(e)}")
                    return jsonify({
                        "success": False,
                        "error": f"Error reading template: {str(e)}"
                    }), 500
            
            return jsonify({
                "success": False,
                "error": f"Template {template_name} not found"
            }), 404

        except Exception as e:
            print(f"Error getting template: {str(e)}")
            return jsonify({
                "success": False,
                "error": str(e)
            }), 500