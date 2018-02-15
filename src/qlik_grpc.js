const PROTO_PATH = `${__dirname}/connector.proto`;
const grpc = require('grpc');

const qlik = grpc.load(PROTO_PATH).qlik.connect;

module.exports = qlik;
