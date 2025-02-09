from flask import Blueprint, jsonify, request, current_app, send_file
import os
import json
import logging
from xml.dom.minidom import Document 
import io
from datetime import datetime

from util.FileUtil import FileUtil
from webhook.WebhookMain import WebhookMain
from webhook.WebhookSample import WebhookSample
from util.ConfigUtil import ConfigUtil

apiWebhook = Blueprint('api_webhook', __name__)

def createInstanceWebhookMain():
    ### FileUtil
    fileUtil = FileUtil()
    fileUtil.start()

    ### TurboMain
    configUtil = ConfigUtil()
    webhookMain = WebhookMain(fileUtil, configUtil)

    return webhookMain


@apiWebhook.route('/api/webhook/loadall', methods=['POST'])
# @auth.login_required
def webhook_loadall():

    logging.info("welcome webhook_loadall...")

    ### Load
    resp = createInstanceWebhookMain().loadWebhooks()

    return resp, 200

@apiWebhook.route('/api/webhook/load', methods=['POST'])
# @auth.login_required
def webhook_load():
    logging.info("welcome webhook_load...")

    ### Get Payload
    payload = request.get_json()

    ### Load
    resp = createInstanceWebhookMain().loadWebhook(payload)

    return resp, 200

@apiWebhook.route('/api/webhook/loadnew', methods=['POST'])
# @auth.login_required
def webhook_loadnew():
    logging.info("welcome webhook_loadnew...")

    ### Get Payload
    payload = request.get_json()

    ### Load
    resp = createInstanceWebhookMain().loadWebhookNew(payload)

    return resp, 200

@apiWebhook.route('/api/webhook/templatechange', methods=['POST'])
def webhook_templatechange():
    logging.info("welcome webhook_templatechange...")

    ### Get Payload
    payload = request.get_json()

    ### Load
    resp = createInstanceWebhookMain().loadWebhookTemplateChange(payload)

    return resp, 200

@apiWebhook.route('/api/webhook/load_webhook_response', methods=['POST'])
# @auth.login_required
def load_webhook_response():
    logging.info("welcome load_webhook_response...")

    ### Get Payload
    payload = request.get_json()

    ### Load
    resp = createInstanceWebhookMain().load_webhook_response(payload)

    return resp, 200


@apiWebhook.route('/api/webhook/save', methods=['POST'])
# @auth.login_required
def webhook_save():
    logging.info("welcome webhook_save...")

    ### Get Payload
    payload = request.get_json()

    ### Add
    resp = createInstanceWebhookMain().saveWebhook(payload)

    return resp, 200


@apiWebhook.route('/api/webhook/ingestToEnvizi', methods=['POST'])
# @auth.login_required
def webhook_ingestToEnvizi():
    logging.info("welcome webhook_ingestToEnvizi...")

    ### Get Payload
    payload = request.get_json()

    ### Add
    resp = createInstanceWebhookMain().ingestToEnvizi(payload)

    return resp, 200

@apiWebhook.route('/api/webhook/viewInScreen', methods=['POST'])
# @auth.login_required
def webhook_viewInScreen():
    logging.info("welcome webhook_viewInScreen...")

    ### Get Payload
    payload = request.get_json()

    ### Add
    resp = createInstanceWebhookMain().viewInScreen(payload)

    return resp, 200

@apiWebhook.route('/api/webhook/add', methods=['POST'])
# @auth.login_required
def webhook_add():
    logging.info("welcome webhook_add...")

    ### Get Payload
    payload = request.get_json()

    ### Add
    resp = createInstanceWebhookMain().addWebhook(payload)

    return resp, 200


@apiWebhook.route('/api/webhook/update', methods=['POST'])
# @auth.login_required
def webhook_update():
    logging.info("welcome webhook_update...")

    ### Get Payload
    payload = request.get_json()

    ### Add
    resp = createInstanceWebhookMain().updateWebhook(payload)

    return resp, 200


@apiWebhook.route('/api/webhook/delete', methods=['POST'])
# @auth.login_required
def webhook_delete():
    logging.info("welcome webhook_add...")

    ### Get Payload
    payload = request.get_json()

    ### Add
    resp = createInstanceWebhookMain().deleteWebhook(payload)

    return resp, 200

@apiWebhook.route('/api/webhook/sample', methods=['POST'])
def webhook_sample():
    logging.info("welcome webhook_sample...")

    configUtil = current_app.config["configUtil"]
    fileUtil = FileUtil()
    fileUtil.start()
    webhookSample = WebhookSample(fileUtil, configUtil)
    
    ### Get Payload
    name = request.args.get('name')

    resp = webhookSample.sampleWebhook(name)

    return resp, 200

@apiWebhook.route('/api/webhook/sample1', methods=['POST'])
def webhook_sample1():
    logging.info("welcome webhook_sample1...")

    configUtil = current_app.config["configUtil"]
    fileUtil = FileUtil()
    fileUtil.start()
    webhookSample = WebhookSample(fileUtil, configUtil)
    
    resp = webhookSample.sample1Webhook()

    return resp, 200

@apiWebhook.route('/api/webhook/sample2', methods=['POST'])
def webhook_sample2():
    logging.info("welcome webhook_sample2...")

    configUtil = current_app.config["configUtil"]
    fileUtil = FileUtil()
    fileUtil.start()
    webhookSample = WebhookSample(fileUtil, configUtil)

    resp = webhookSample.sample2Webhook()

    return resp, 200

@apiWebhook.route('/api/webhook/sample3', methods=['POST'])
def webhook_sample3():
    logging.info("welcome webhook_sample3...")

    configUtil = current_app.config["configUtil"]
    fileUtil = FileUtil()
    fileUtil.start()
    webhookSample = WebhookSample(fileUtil, configUtil)

    resp = webhookSample.sample3Webhook()

    return resp, 200

@apiWebhook.route('/api/webhook/sample4', methods=['POST'])
def webhook_sample4():
    logging.info("welcome webhook_sample4...")

    configUtil = current_app.config["configUtil"]
    fileUtil = FileUtil()
    fileUtil.start()
    webhookSample = WebhookSample(fileUtil, configUtil)
    
    resp = webhookSample.sample4Webhook()

    return resp, 200

@apiWebhook.route('/api/webhook/sample5', methods=['POST'])
def webhook_sample5():
    logging.info("welcome webhook_sample5...")

    configUtil = current_app.config["configUtil"]
    fileUtil = FileUtil()
    fileUtil.start()
    webhookSample = WebhookSample(fileUtil, configUtil)

    resp = webhookSample.sample5Webhook()

    return resp, 200

@apiWebhook.route('/api/webhook/generate-and-upload', methods=['POST'])
def webhook_generate_and_upload():
    logging.info("welcome webhook_generate_and_upload...")
    
    payload = request.get_json()
    data = payload.get('data')
    envizi_config = payload.get('enviziConfig')
    template = payload.get('template')
    
    if not all([data, envizi_config, template]):
        return jsonify({
            "success": False,
            "error": "Missing required parameters"
        }), 400
    
    try:
        # Process data and generate Excel
        webhook_main = createInstanceWebhookMain()
        result = webhook_main.processForIngestion({
            "data": data,
            "envizi_template": template,
            "envizi_config": envizi_config
        }, True)  # True for pushToS3
        
        return jsonify({
            "success": True,
            "file_details": result
        }), 200
        
    except Exception as e:
        logging.error(f"Error in webhook_generate_and_upload: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@apiWebhook.route('/api/webhook/generate-excel', methods=['POST'])
def webhook_generate_excel():
    logging.info("welcome webhook_generate_excel...")
    
    payload = request.get_json()
    data = payload.get('data')
    envizi_config = payload.get('enviziConfig')
    template = payload.get('template')
    
    if not all([data, template]):
        return jsonify({
            "success": False,
            "error": "Missing required parameters"
        }), 400
    
    try:
        # Process data and generate Excel without S3 upload
        webhook_main = createInstanceWebhookMain()
        result = webhook_main.processForIngestion({
            "data": data,
            "envizi_template": template,
            "envizi_config": envizi_config
        }, False)  # False for no S3 upload
        
        # Read the generated Excel file
        file_path = result.get('uploadedFile')
        if not file_path or not os.path.exists(file_path):
            raise Exception("Excel file not generated")
            
        with open(file_path, 'rb') as f:
            excel_data = f.read()
            
        # Clean up the temporary file
        os.remove(file_path)
        
        # Return the Excel file
        return send_file(
            io.BytesIO(excel_data),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f"envizi-data-{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        )
        
    except Exception as e:
        logging.error(f"Error in webhook_generate_excel: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500