import os
import logging
from xml.dom.minidom import Document 
from dotenv import load_dotenv

from typing import Dict, Optional, Any, Iterable, List
import uuid

import logging 
import os, json
import pandas as pd
from datetime import datetime

from util.FileUtil import FileUtil
from util.ConfigUtil import ConfigUtil
from util.DictionaryUtil import DictionaryUtil
from util.ApiUtil import ApiUtil
from util.DateUtils import DateUtils
from util.ExcelUtil import ExcelUtil
from excel.ExcelProcessor import ExcelProcessor
from webhook.WebhookDB import WebhookDB
from webhook.WebhookEnviziMapping import WebhookEnviziMapping
from webhook.WebhookRun import WebhookRun
from CommonConstants import *
from template.TemplateMain import TemplateMain
from template.TemplateDataValidator import TemplateDataValidator
from envizi.EnviziMain import EnviziMain

class WebhookMain(object):

    def __init__(
        self,
        fileUtil: FileUtil,
        configUtil: ConfigUtil
    ) -> None:
        self.fileUtil = fileUtil
        self.configUtil = configUtil
        load_dotenv()
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(os.environ.get('LOGLEVEL', 'INFO').upper())
        self._init_config()

    def _init_config(self):
        self.LOAD_ENVIZI_DATA = os.getenv("LOAD_ENVIZI_DATA") 
        self.DATA_STORE_FOLDER = os.getenv("DATA_STORE_FOLDER") 
        self.WEBHOOK_FOLDER = self.DATA_STORE_FOLDER + "/webhook/"
        self.WEBHOOK_FILE = self.WEBHOOK_FOLDER + "/webhook.json"
        self.excelUtil = ExcelUtil()
        self.excelProcessor = ExcelProcessor(self.fileUtil, self.configUtil)
        self.webhookDB = WebhookDB(self.fileUtil, self.configUtil)
        self.webhookEnviziMapping = WebhookEnviziMapping(self.fileUtil, self.configUtil)
        self.webhookRun = WebhookRun(self.fileUtil, self.configUtil)
        self.enviziMain = EnviziMain(self.fileUtil, self.configUtil)
        self.templateMain = TemplateMain(self.fileUtil, self.configUtil)
        self.templateDataValidator = TemplateDataValidator(self.fileUtil, self.configUtil)

    def loadWebhooks(self):
        self.logger.info("loadWebhooks  ... ")

        data = self.fileUtil.loadJsonFileContent(self.WEBHOOK_FILE)

        ### Write it in output file
        self.fileUtil.writeInFileWithCounter("webhook.json", json.dumps(data))

        resp = {
            "msg": "Webhooks loaded successfully",
            "data": data,
        }

        return resp
    
    def loadWebhook(self, payload):
        self.logger.info("loadWebhook  ... ")
        self.logger.info("loadWebhook : " + json.dumps(payload))

        ### Retrieve webhook details from DB (file)
        id = payload["id"]
        webhook_detail_data = self.webhookDB.loadWebhookDetailById(id)

        ### Run webhook
        webhook_execute_response = self.webhookRun.run_webhook(webhook_detail_data)

        resp = {
            "msg": "Webhook data is loaded successfully",
            "data": webhook_detail_data,
            "webhook_response": webhook_execute_response
        }

        ### Write it in output file
        self.fileUtil.writeInFileWithCounter("webhook.json", json.dumps(resp))

        return resp


    def loadWebhookNew(self, payload):
        self.logger.info("loadWebhookNew  ... ")
        self.logger.info("loadWebhookNew : " + json.dumps(payload))

       ### Retrive locations and accounts
        locations = []
        accounts = []
        if (self.LOAD_ENVIZI_DATA == "TRUE") : 
            list  = self.enviziMain.exportLocation()
            locations = list["data"]
            list = self.enviziMain.exportAccounts()
            accounts = list["data"]

        ### Generate Empty Data
        webhook_detail_data = self.webhookDataGiver.generateEmptyData(locations, accounts)

        resp = {
            "msg": "Webhook data is loaded successfully",
            "data": webhook_detail_data,
        }

        ### Write it in output file
        self.fileUtil.writeInFileWithCounter("webhook.json", json.dumps(resp))

        return resp


    def loadWebhookTemplateChange(self, payload):
        self.logger.info("loadWebhookTemplateChange  ... ")
        self.logger.info("loadWebhookTemplateChange : " + json.dumps(payload))

        ### Retrive locations and accounts
        locations = []
        accounts = []
        if (self.LOAD_ENVIZI_DATA == "TRUE") : 
            list  = self.enviziMain.exportLocation()
            locations = list["data"]
            list = self.enviziMain.exportAccounts()
            accounts = list["data"]

        ### Generate fields based on template
        self.webhookDataGiver.populateFields(payload, locations, accounts)

        resp = {
            "msg": "Webhook data is loaded successfully",
            "data": payload,
        }

        ### Write it in output file
        self.fileUtil.writeInFileWithCounter("excelpro.json", json.dumps(resp))

        return resp
   

    def load_webhook_response(self, payload):
        self.logger.info("load_webhook_response  ... ")
        self.logger.info("load_webhook_response : " + json.dumps(payload))

        ### Run webhook
        webhook_execute_response = self.webhookRun.run_webhook(payload)

        resp = {
            "msg": "Webhook data is refreshed successfully",
            "data": webhook_execute_response
        }

        ### Write it in output file
        self.fileUtil.writeInFileWithCounter("webhook_execute_response.json", json.dumps(resp))

        return resp
    
    def saveWebhook(self, payload):
        self.logger.info("saveWebhook  ... ")

        ### Save webhook master
        id = self.webhookDB.saveWebhookMaster(payload)
        payload["id"] = id

        ### Save webhook detail
        result = self.webhookDB.saveWebhookDetail(payload)

        ### Run webhook
        webhook_response = self.webhookRun.run_webhook(payload)

        resp = {
            "msg": "Webhook is saved successfully",
            "data": result,
            "webhook_response" : webhook_response
        }
        return resp
    
    def updateWebhook(self, payload):
        self.logger.info("updateWebhook  ... ")

        ### Save webhook detail
        result = self.webhookDB.saveWebhookDetail(payload)
        resp = {
            "msg": "Webhook is updated successfully",
            "data": result
        }
        return resp

    def deleteWebhook(self, payload):
        self.logger.info("deleteWebhook  ... ")
        result = self.webhookDB.deleteWebhook(payload)
        resp = {
            "msg": "Webhook data is deleted successfully",
            "data": result
        }
        return resp

    def ingestToEnvizi(self, payload):
        self.logger.info("ingestToEnvizi  ... ")
        ### Retrieve webhook details from DB (file)
        # id = payload["id"]
        # webhook_detail_data = self.webhookDB.loadWebhookDetailById(id)

        ### Process
        resp = self.processForIngestion (payload, True)
        return resp

    ### User wants to see the UDC data while editiing the webhook
    def viewInScreen(self, payload):
        self.logger.info("viewInScreen  ... ")
        resp = self.processForIngestion (payload, False)
        return resp
    
    def processForIngestion(self, payload, pushToS3=False):
        try:
            self.logger.info(f"Starting processForIngestion with pushToS3={pushToS3}")
            data = payload.get('data')
            template = payload.get('envizi_template')
            envizi_config = payload.get('envizi_config')

            if not all([data, template]):
                raise Exception("Missing required data or template")

            self.logger.info(f"Processing {len(data)} records with template {template}")

            # Generate Excel file
            output_dir = self.fileUtil.getOutputFolder()
            file_name = f"envizi-data-{datetime.now().strftime('%Y-%m-%d-%H%M%S')}.xlsx"
            file_path = os.path.join(output_dir, file_name)

            self.logger.info(f"Will generate Excel file at: {file_path}")

            # Create Excel file with data validation
            excel_data = []
            validation_errors = []

            for idx, record in enumerate(data):
                try:
                    transformed_record = self.transformRecord(record, template)
                    validation_result = self.validateRecord(transformed_record, template)
                    
                    if validation_result['isValid']:
                        excel_data.append(transformed_record)
                    else:
                        validation_errors.extend([f"Record {idx + 1}: {err}" for err in validation_result['errors']])
                except Exception as e:
                    self.logger.error(f"Error processing record {idx + 1}: {str(e)}")
                    validation_errors.append(f"Record {idx + 1}: Processing error - {str(e)}")

            self.logger.info(f"Processed {len(excel_data)} valid records, found {len(validation_errors)} errors")

            # Create Excel writer
            writer = pd.ExcelWriter(file_path, engine='xlsxwriter')

            # Write data to 'Data' sheet
            df_data = pd.DataFrame(excel_data)
            df_data.to_excel(writer, sheet_name='Data', index=False)

            # Write validation errors to 'Validation' sheet if any
            if validation_errors:
                df_validation = pd.DataFrame(validation_errors, columns=['Error'])
                df_validation.to_excel(writer, sheet_name='Validation', index=False)

            # Save and close
            writer.close()

            self.logger.info(f"Excel file generated successfully at {file_path}")

            result = {
                'success': True,
                'file_path': file_path,
                'file_name': file_name,
                'validation_errors': validation_errors
            }

            # Push to S3 if requested
            if pushToS3 and envizi_config:
                self.logger.info("Pushing file to S3...")
                s3_result = self.pushToS3(file_path, envizi_config)
                result.update(s3_result)

            return result

        except Exception as e:
            self.logger.error(f"Error in processForIngestion: {str(e)}")
            raise

    def transformRecord(self, record, template):
        """Transform a record according to the template format"""
        transformed = {}
        
        # Get template fields
        template_fields = self.getTemplateFields(template)
        
        for field in template_fields:
            field_name = field['name']
            field_type = field['type']
            
            # Get value from record, using field name as key
            value = record.get(field_name)
            
            # Transform value based on type
            if value is not None:
                if field_type == 'date':
                    try:
                        value = pd.to_datetime(value).strftime('%Y-%m-%d')
                    except:
                        value = None
                elif field_type == 'number':
                    try:
                        value = float(value)
                    except:
                        value = None
                else:
                    value = str(value)
                
            transformed[field_name] = value
        
        return transformed

    def validateRecord(self, record, template):
        """Validate a record against the template requirements"""
        errors = []
        template_fields = self.getTemplateFields(template)
        
        for field in template_fields:
            field_name = field['name']
            value = record.get(field_name)
            
            # Check required fields
            if field['required'] and (value is None or value == ''):
                errors.append(f"Required field '{field_name}' is missing or empty")
                continue
            
            # Validate value type if present
            if value is not None and value != '':
                if field['type'] == 'date':
                    try:
                        pd.to_datetime(value)
                    except:
                        errors.append(f"Invalid date format for field '{field_name}'")
                elif field['type'] == 'number':
                    try:
                        float(value)
                    except:
                        errors.append(f"Invalid number format for field '{field_name}'")
        
        return {
            'isValid': len(errors) == 0,
            'errors': errors
        }

    def getTemplateFields(self, template_name):
        """Get fields for a template"""
        # First check if it's the default template
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
        
        # Otherwise load from templates directory
        template_path = os.path.join(self.fileUtil.BASE_DIR, 'data-store', 'templates', f"{template_name}.json")
        if os.path.exists(template_path):
            with open(template_path, 'r') as f:
                template = json.load(f)
                return template['fields']
            
        raise Exception(f"Template {template_name} not found")