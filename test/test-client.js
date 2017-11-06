const PROTO_PATH = `${__dirname}/grpc_server.proto`;
const grpc = require('grpc');
const qlik = require('../src/qlik_grpc');

function test() {
	var client = new qlik.Connector('localhost:50051', grpc.credentials.createInsecure());

	const req = {
		connection: {
			connectionString: 'provider=mongodb-grpc-connector;hostname=localhost',
			user: 'test',
			password: 'test'
		},
		sessionInfo: {
			user: '',
			sessionId: '',
			docId: ''
		},
		parameters: {
			statement: '{ "collection": "airports" }',
			statementParameters: ''
		}
	}

	const t0 = new Date().getTime();
	const call = client.getData(req);
	call.on('data', (data) => {
		console.log("Client received data", data.cols[0].strings.length)
	});
	call.on('end', (x) => {
		const t1 = new Date().getTime();
		console.log("Client ended on client side", t1 - t0, "ms");
	});
}

test();