
/**
 * Module Deps
 */

var queryString = require('querystring')
  , templates = require('./templates')
  , request = require('superagent')
  , parseXml = require('xml2json').toJson;

/**
 * [Td description]
 * @param {[type]} options [description]
 */

var Td = module.exports = function Td(options) {
  if (!(this instanceof Td)){ return new Td(options); }

  var self = this;
  options = options || {};

  self.id = options.id;
  self.key = options.key;
  self.url = (options.env === 'live') ? 'api.authorize.net' : 'apitest.authorize.net',
  self.path = options.path || '/xml/v1/request.api';

};

Td.prototype.getSettledBatchList = function(params, cb) {
  this.sendRequest('getSettledBatchList', params, cb);
};

Td.prototype.getTransactionList = function(params, cb) {
  this.sendRequest('getTransactionList', params, cb);
};

Td.prototype.getTransactionDetails = function(params, cb) {
  this.sendRequest('getTransactionDetails', params, cb);
};

Td.prototype.getUnsettledTransactionList = function(params, cb) {
  this.sendRequest('getUnsettledTransactionList', params, cb);
};

Td.prototype.getBatchStatistics = function(params, cb) {
  this.sendRequest('getBatchStatistics', params, cb);
};

/**
 * [sendRequest description]
 * @param  {[type]} method [description]
 * @param  {[type]} params [description]
 * @return {[type]}        [description]
 */

Td.prototype.sendRequest = function (method, params, fn) {
  var self = this;
  var callback = fn || function (){};
  var data = params || {};

  data.requestType = method;
  data.login = self.id;
  data.transactionKey = self.key;

  var body = templates.build(method, params, data);
  if (body instanceof Array) { return self.emit('error', body); }

  request
    .post('https://' + self.url + self.path)
    .type('xml')
    .send(body)
    .end(function(err, res){
        if (!res.ok) return callback(err,res.text);
        var jsonData = parseXml(res.text, {object: true});
        var data = jsonData[Object.keys(jsonData)[0]];
        delete data['xmlns:xsi'];
        delete data['xmlns:xsd'];
        delete data.xmlns;
        var isError = data.messages.resultCode.toLowerCase();
        data.error = data.messages.message.text;
        data.code = data.messages.message.code;
        if( isError === 'error') { return callback({code:data.code,message:data.error},data); }

        if (data.directResponse) {
          var dr = data.directResponse.split(',');
          data.response_code = dr[0];
          data.response_subcode = dr[1];
          data.reason_code = dr[2];
          data.response_reason = dr[3];
          data.auth_code = dr[4];
          data.avs = dr[5];
          data.transaction_id = dr[6];
        }

        callback(err, data);
  });
};
