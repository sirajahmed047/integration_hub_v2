from flask import Blueprint, jsonify, request
from dotenv import load_dotenv
from webhook.WebhookEnviziMapping import WebhookEnviziMapping
from util.FileUtil import FileUtil
from util.ConfigUtil import ConfigUtil

load_dotenv()  # Load environment variables from .env file
webhook_routes = Blueprint('webhook_routes', __name__)

@webhook_routes.route('/api/transform-webhook', methods=['POST'])
def transform_webhook():
    try:
        data = request.json
        print("Received data:", data)  # Debug log
        
        if not data or 'webhook_detail_data' not in data:
            return jsonify({
                "success": False,
                "error": "Missing webhook_detail_data in request"
            }), 400

        webhook_detail_data = data['webhook_detail_data']
        print("Webhook detail data:", webhook_detail_data)  # Debug log
        
        if 'data_template_type' not in webhook_detail_data:
            return jsonify({
                "success": False,
                "error": "Missing data_template_type in webhook_detail_data"
            }), 400

        try:
            # Initialize required dependencies
            fileUtil = FileUtil()
            configUtil = ConfigUtil()
            
            # Create mapper with dependencies
            mapper = WebhookEnviziMapping(fileUtil, configUtil)
            result = mapper.map_webhook_data_to_envizi_format(data)
            return jsonify({
                "success": True,
                "processed_data": result["processed_data"],
                "validation_errors": result["validation_errors"]
            })
        except Exception as mapping_error:
            print(f"Mapping error: {str(mapping_error)}")  # Debug log
            return jsonify({
                "success": False,
                "error": f"Mapping error: {str(mapping_error)}"
            }), 500
            
    except Exception as e:
        print(f"Error in transform_webhook: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500 