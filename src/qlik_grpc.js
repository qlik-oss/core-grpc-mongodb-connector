const PROTO_PATH = `${__dirname}/grpc_server.proto`;
const grpc = require('grpc');
const qlik = grpc.load(PROTO_PATH).qlik;

module.exports = qlik;
