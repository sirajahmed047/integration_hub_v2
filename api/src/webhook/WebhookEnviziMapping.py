import os
import logging
from xml.dom.minidom import Document 
from dotenv import load_dotenv
from datetime import datetime

import logging 
import os, json

from util.FileUtil import FileUtil
from util.ConfigUtil import ConfigUtil
from util.DictionaryUtil import DictionaryUtil
from util.JsonUtil import JsonUtil
from util.ExcelUtil import ExcelUtil
from util.MathUtil import MathUtil
from CommonConstants import *
from template.TemplateDataValidator import TemplateDataValidator

class WebhookEnviziMapping(object):

    def __init__(self, fileUtil, configUtil):
        self.fileUtil = fileUtil
        self.configUtil = configUtil
        self.templateDataValidator = TemplateDataValidator(fileUtil, configUtil)
        self.logger = logging.getLogger(__name__)
        load_dotenv()
        self.logger.setLevel(os.environ.get('LOGLEVEL', 'INFO').upper())
        self._init_config()

    def _init_config(self):
        self.DATA_STORE_FOLDER = os.getenv("DATA_STORE_FOLDER") 
        self.WEBHOOK_FOLDER = self.DATA_STORE_FOLDER + "/webhook/"
        self.WEBHOOK_FILE = self.WEBHOOK_FOLDER + "/webhook.json"
        self.excelUtil = ExcelUtil()

    def map_webhook_data_to_envizi_format(self, mydata):
        try:
            webhook_detail_data = mydata.get("webhook_detail_data", {})
            webhook_execute_response = mydata.get("webhook_execute_response", {})
            data_template_type = webhook_detail_data.get("data_template_type")

            # Get rows based on template type
            rows = self._get_rows_from_response(webhook_execute_response, webhook_detail_data)
            
            processed_data = []
            validation_errors = {}

            for index, webhook_row_data in enumerate(rows, 1):
                processed_row = self._map_webhook_row(index, mydata, webhook_row_data, validation_errors)
                if processed_row:
                    processed_data.append(processed_row)

            return {
                "processed_data": processed_data,
                "validation_errors": validation_errors
            }
        except Exception as e:
            self.logger.error(f"Error in map_webhook_data_to_envizi_format: {str(e)}")
            raise

    def _map_webhook_row(self, index, mydata, webhook_row_data, validation_errors):
        try:
            # Required template fields for Envizi
            required_fields = [
                "Organization",
                "Location",
                "Account Style Caption",
                "Account Number",
                "Account Name",
                "Start Date",
                "End Date",
                "Usage Amount",
                "Usage Unit",
                "Cost Amount",
                "Cost Unit",
                "Supplier",
                "Reference",
                "Notes"
            ]

            processed_row = {}
            mappingFieldsArray = mydata.get("webhook_detail_data", {}).get("fields", [])

            # Process each required field
            for field in required_fields:
                field_mapping = next(
                    (m for m in mappingFieldsArray if m.get("label") == field),
                    None
                )

                if field_mapping:
                    # Process mapped field
                    value = self._process_field_value(webhook_row_data, field_mapping)
                    processed_row[field] = value
                else:
                    # Use default/empty value for unmapped fields
                    processed_row[field] = ""

                # Validate the field
                self._validate_field(
                    field, 
                    processed_row[field], 
                    index, 
                    validation_errors,
                    mydata.get("locations", []),
                    mydata.get("accounts", []),
                    mydata.get("account_styles", [])
                )

            return processed_row
        except Exception as e:
            self.logger.error(f"Error processing row {index}: {str(e)}")
            validation_errors[index] = [str(e)]
            return None

    def _process_field_value(self, webhook_row_data, field_mapping):
        try:
            map_value = field_mapping.get("map_value", "")
            if not map_value:
                return ""

            # Handle dot notation for nested fields
            parts = map_value.split('.')
            value = webhook_row_data
            
            # For non-nested fields, try direct access first
            if len(parts) == 1:
                return str(webhook_row_data.get(map_value, ""))
            
            # Handle nested fields (like records.0.PriceArea)
            current = webhook_row_data
            for part in parts:
                if part.isdigit():  # Handle array indices
                    try:
                        current = current[int(part)]
                    except (IndexError, TypeError):
                        print(f"Error accessing array index {part} in {map_value}")
                        return ""
                else:
                    try:
                        current = current.get(part, "")
                    except AttributeError:
                        print(f"Error accessing field {part} in {map_value}")
                        return ""
                
            return str(current) if current is not None else ""
        
        except Exception as e:
            print(f"Error processing field {field_mapping.get('label')}: {str(e)}")
            return ""

    def _validate_field(self, field, value, index, validation_errors, locations, accounts, account_styles):
        """Validate a field value"""
        try:
            error = None
            
            # Required field validations
            if field == "Organization" and not value:
                error = "Organization is required"
            elif field == "Location" and not value:
                error = "Location is required"
            elif field == "Account Style Caption" and not value:
                error = "Account Style Caption is required"
            
            # Reference data validations
            if field == "Location" and value and value not in [loc.get("name") for loc in locations]:
                error = f"Invalid location: {value}"
            elif field == "Account Style Caption" and value and value not in [style.get("name") for style in account_styles]:
                error = f"Invalid account style: {value}"
            
            # Date validations
            if field in ["Start Date", "End Date"] and value:
                try:
                    datetime.strptime(value, "%Y-%m-%d")
                except ValueError:
                    error = f"Invalid date format for {field}. Expected YYYY-MM-DD"
            
            # Numeric validations
            if field in ["Usage Amount", "Cost Amount"] and value:
                try:
                    float(value)
                except ValueError:
                    error = f"Invalid numeric value for {field}"

            if error:
                if index not in validation_errors:
                    validation_errors[index] = []
                validation_errors[index].append(error)

        except Exception as e:
            self.logger.error(f"Validation error for field {field}: {str(e)}")

    def _get_rows_from_response(self, webhook_execute_response, webhook_detail_data):
        """Extract rows from the webhook response based on template type"""
        try:
            if webhook_detail_data.get("data_template_type") == "1-single":
                # For single record template, treat the whole response as one row
                return [webhook_execute_response]
            else:
                # For multiple records, return the records array
                return webhook_execute_response.get("records", [])
        except Exception as e:
            print(f"Error getting rows: {str(e)}")
            return []

    def _apply_operation(self, value, operation, text_value):
        """Apply operation to field value"""
        try:
            if not value:
                return text_value

            if operation == "+":
                return str(float(value) + float(text_value or 0))
            elif operation == "-":
                return str(float(value) - float(text_value or 0))
            elif operation == "*":
                return str(float(value) * float(text_value or 1))
            elif operation == "%":
                return str(float(value) / 100.0)
            elif operation == "Append" and text_value:
                return f"{value}{text_value}"
            else:
                return value
        except Exception as e:
            self.logger.error(f"Error applying operation {operation}: {str(e)}")
            return value

    def _process_template_mapping(self, data, mapping):
        try:
            # Handle array paths with [*]
            path = mapping.get("sourcePath", "")
            is_array = "[*]" in path
            
            if is_array:
                # Convert template path to actual path
                base_path = path.split("[*]")[0].rstrip(".")
                array_data = self._get_nested_value(data, base_path)
                
                if not isinstance(array_data, list):
                    return ""
                    
                # Process each array item
                results = []
                for item in array_data:
                    remaining_path = path.split("[*]")[1].lstrip(".")
                    value = self._get_nested_value(item, remaining_path) if remaining_path else item
                    results.append(str(value))
                    
                return ", ".join(results)
            else:
                # Handle regular paths
                return str(self._get_nested_value(data, path))
                
        except Exception as e:
            print(f"Error processing template mapping: {str(e)}")
            return ""
            
    def _get_nested_value(self, obj, path):
        """Safely get nested value from object using dot notation"""
        if not path:
            return obj
            
        parts = path.split(".")
        current = obj
        
        for part in parts:
            if isinstance(current, dict):
                current = current.get(part)
            else:
                return ""
                
            if current is None:
                return ""
                
        return current
