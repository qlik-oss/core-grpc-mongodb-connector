const WebSocket = require('ws');
const schema = require('enigma.js/schemas/12.34.11.json');
var enigma = require('enigma.js');

const host = process.env.TEST_HOST || 'localhost';

// create a new session:
const session = enigma.create({
	schema,
	url: `ws://${host}:9076/app/engineData`,
	createSocket: url => new WebSocket(url),
});

var global
var app;
var reloadRequestId;
var appId = "reloadapp.qvf";
var connectionId;
var trafficLog = false;

if (trafficLog) {
	// bind traffic events to log what is sent and received on the socket:
	session.on('traffic:sent', data => console.log('sent:', data));
	session.on('traffic:received', data => console.log('received:', data));
}

session.open()
	.then((_global) => {
		global = _global;
		console.log('Creating/opening app');
		return global.createApp(appId).then((appInfo) => {
			return global.openDoc(appInfo.qAppId)
		}).catch((err) => {
			return global.openDoc(appId)
		});
	})
	.then((_app) => {
		console.log('Creating connection');
		app = _app;
		return app.createConnection({
			qType: 'mongodb-grpc-connector',
			qName: 'mongodb',
			qConnectionString: 'CUSTOM CONNECT TO "provider=mongodb-grpc-connector;hostname=mongodb-database"',
			qUserName: 'test',
			qPassword: 'test'
		})
	})
	.then((_connectionId) => {
		connectionId = _connectionId;
		console.log('Setting script');
		const script = `
			lib connect to 'mongodb';
			Airports:
			sql { "collection": "airports", "find": {} };
		`;
		return app.setScript(script);
	})
	.then(() => {
		console.log('Reloading');
		var reloadPromise = app.doReload();
		reloadRequestId = reloadPromise.requestId;
		return reloadPromise;
	})
	.then(() => {
		return global.getProgress(reloadRequestId)
	})
	.then((progress) => {
		console.log(JSON.stringify(progress));
	})
	.then(() => {
		console.log('Removing connection before saving');
		return app.deleteConnection(connectionId)
	})
	.then(() => {
		console.log('Removing script before saving');
		return app.setScript("");
	})
	.then(() => {
		console.log('Saving');
		return app.doSave()
	})
	.then(() => {
		console.log('Fetching Table sample');
		return app.getLineage()
	})
	.then((appProperties) => {
		console.log('AppProperties', JSON.stringify(appProperties, undefined, "   "));
	})
	.then(() => {
		console.log('Fetching Table sample');
		return app.getTableData(-1, 50, true, "Airports")
	})
	.then((tableData) => {
		//Convert table grid into a string using some functional magic
		var tableDataAsString = tableData.map((row) => row.qValue.map((value) => value.qText).reduce((left, right) => left + "\t" + right)).reduce((row1, row2) => row1 + "\n" + row2)
		console.log(tableDataAsString);
	})
	.then(() => session.close())
	.then(() => console.log('Session closed'))
	.catch(err => {
		console.log('Something went wrong :(', err);
		process.exit(1);
	});