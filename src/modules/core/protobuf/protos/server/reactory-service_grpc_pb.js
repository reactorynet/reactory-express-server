// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var reactory$service_pb = require('./reactory-service_pb.js');

function serialize_core_ApiStatusReply(arg) {
  if (!(arg instanceof reactory$service_pb.ApiStatusReply)) {
    throw new Error('Expected argument of type core.ApiStatusReply');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_core_ApiStatusReply(buffer_arg) {
  return reactory$service_pb.ApiStatusReply.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_core_ApiStatusRequest(arg) {
  if (!(arg instanceof reactory$service_pb.ApiStatusRequest)) {
    throw new Error('Expected argument of type core.ApiStatusRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_core_ApiStatusRequest(buffer_arg) {
  return reactory$service_pb.ApiStatusRequest.deserializeBinary(new Uint8Array(buffer_arg));
}


// The greeting service definition.
var SystemServiceService = exports.SystemServiceService = {
  // Sends a greeting
getApiStatus: {
    path: '/core.SystemService/getApiStatus',
    requestStream: false,
    responseStream: false,
    requestType: reactory$service_pb.ApiStatusRequest,
    responseType: reactory$service_pb.ApiStatusReply,
    requestSerialize: serialize_core_ApiStatusRequest,
    requestDeserialize: deserialize_core_ApiStatusRequest,
    responseSerialize: serialize_core_ApiStatusReply,
    responseDeserialize: deserialize_core_ApiStatusReply,
  },
};

exports.SystemServiceClient = grpc.makeGenericClientConstructor(SystemServiceService);
