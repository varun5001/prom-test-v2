/*eslint-disable unknown-require*/

'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var Conversation = require('watson-developer-cloud/conversation/v1');
var watson = require('watson-developer-cloud');

var app = express();
app.use(express.static('./public'));
app.use(bodyParser.json());
var conversation = new Conversation({
	url: 'https://gateway.watsonplatform.net/conversation/api',
	version_date: '2016-10-21',
	version: 'v1'
});
var retrieve_and_rank = watson.retrieve_and_rank({
	username: 'c6ce8010-2d51-4240-8ea1-ca7fef98124a',
	password: 'Vts6xmWJ7FUw',
	version: 'v1'
});
var params = {
	cluster_id: 'sc095bfcdb_c4b4_4fc6_b182_7493ceac558e',
	collection_name: 'soho'
};
var qs = require('qs');
var solrClient = retrieve_and_rank.createSolrClient(params);
var ranker_id = '7ff701x33-rank-1608';

function updateConversation(intent_update, output_rnr) {
	console.log("inside rip");
	console.log("intent:" + intent_update);
	console.log("output_rnr:" + output_rnr);
	var headers_conv = {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
		'Authorization': 'Basic YWFjZWU2MTgtOTEwMS00N2NhLWEzZGQtMzBhOGJmMWMxZGMyOnQ3SW1XSkxrODJ4bQ=='
	};
	var dataString = '{ "output": { "text": {  "values": [' + output_rnr + '], "selection_policy": "sequential" }  }  }';
	var options_conv = {
		url: 'https://watson-api-explorer.mybluemix.net/conversation/api/v1/workspaces/ce88aa87-ad00-4d17-81e6-aa3d697b7765/dialog_nodes/' + intent_update + '?version=2017-05-26',
		method: 'POST',
		headers: headers_conv,
		body: dataString
	};

	function callback_conv(error, response, body) {
		if (!error && response.statusCode === 200) {
			console.log(body);
		} else {
			console.log("response body:" + response.body);
			console.log("error" + error);
		}
	}
	request(options_conv, callback_conv);
}
app.post('/api/message', function(req, res) {
	var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
	if (!workspace || workspace === '<workspace-id>') {
		return res.json({
			'output': {
				'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
			}
		});
	}
	var payload = {
		workspace_id: workspace,
		context: req.body.context || {},
		input: req.body.input || {}
	};

	// Send the input to the conversation service
	conversation.message(payload, function(err, data) {
			if (err) {
				return res.status(err.code || 500).json(err);
			}
			console.log("retrun to ui");
			var response = data;
			var result = '';
			if (!response.output) {
				response.output = {};
				console.log("response.output build");

			} else {
				console.log("inside else");
				if (response.intents.length > 0) {
					var nodeID = '';
					var question = response.input.text;
					if (response.intents.intent == "shipping_and_delivery") {
						nodeID = 'node_8_1505918860284';
					}
					if (response.output.nodes_visited[0] === 'node_15_1505920385051') {
						nodeID = 'node_15_1505920385051';
						if (response.entities[0].value === 'yes') {
							question = 'what are different shipping softwares?';

						}
					}

					if (response.output.nodes_visited[0] === 'node_1_1505930914189') {
						nodeID = 'node_1_1505930914189';
						if (response.entities[0].value === 'yes') {
							question = 'how to pack fragile shipment';
						}

					}
					if (response.output.nodes_visited[0] === 'node_4_1505937023213') {
						nodeID = 'node_4_1505937023213';
						if (response.entities[0].value === 'yes') {
							question = 'how do i ship hazardous goods';
						}
					}
				
				console.log("inside if");

				var entity = '';
				if (response.entities.length > 0) {
					entity = response.entities[0].value;
				}

				var query = qs.stringify({
					q: entity + ' ' + question,
					ranker_id: ranker_id,
					fl: 'contentHtml'
				});

				solrClient.get('fcselect', query, function(err, searchResponse) {
					if (err) {
						console.log('Error searching for documents: ' + err);
					} else {
						console.log("start of rnr");
						console.log(question);
						//result = JSON.stringify(searchResponse.response.docs[0].contentHtml, null, 1);
						if (JSON.stringify(searchResponse.response.numFound) !== '0') {
							result = searchResponse.response.docs[0].contentHtml;
						} else {
							result = '';
						}
						//result = result.substr(1, result.length-1).replace('\"', '"');
						console.log("result:" + result);
						console.log("response.output.text[0]:" + response.output.text[0]);
						response.output.text[0] = result + response.output.text[0];
						console.log("before con");
						//updateConversation(nodeID, JSON.stringify(result));
						console.log("after con");


						return res.json(response);
					}
				});

			} else {
				return res.json(response);
			}

		}

	});
});



module.exports = app;