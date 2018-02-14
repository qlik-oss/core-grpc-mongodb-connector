const WebSocket = require('ws');
const schema = require('enigma.js/schemas/12.34.11.json');
const enigma = require('enigma.js');

const host = process.env.TEST_HOST || 'localhost';

// create a new session:
const session = enigma.create({
  schema,
  url: `ws://${host}:9076/app/engineData`,
  createSocket: url => new WebSocket(url),
});

let global;
let app;
let reloadRequestId;
const appId = 'reloadapp.qvf';
let connectionId;
const trafficLog = false;

if (trafficLog) {
  // bind traffic events to log what is sent and received on the socket:
  session.on('traffic:sent', data => console.log('sent:', data));
  session.on('traffic:received', data => console.log('received:', data));
}

session.open()
  .then((_global) => {
    global = _global;
    console.log('Creating/opening app');
    return global.createApp(appId).then(appInfo => global.openDoc(appInfo.qAppId)).catch(() => global.openDoc(appId));
  })
  .then((_app) => {
    console.log('Creating connection');
    app = _app;
    return app.createConnection({
      qType: 'mongodb-grpc-connector',
      qName: 'mongodb',
      qConnectionString: 'CUSTOM CONNECT TO "provider=mongodb-grpc-connector;hostname=mongodb-database"',
      qUserName: 'test',
      qPassword: 'test',
    });
  })
  .then((_connectionId) => {
    connectionId = _connectionId;
    console.log('Setting script');
    const script = 'lib connect to "mongodb"; Airports: sql { "collection": "airports", "find": {} };';
    return app.setScript(script);
  })
  .then(() => {
    console.log('Reloading');
    const reloadPromise = app.doReload();
    reloadRequestId = reloadPromise.requestId;
    return reloadPromise;
  })
  .then(() => global.getProgress(reloadRequestId))
  .then((progress) => {
    console.log(JSON.stringify(progress));
  })
  .then(() => {
    console.log('Removing connection before saving');
    return app.deleteConnection(connectionId);
  })
  .then(() => {
    console.log('Removing script before saving');
    return app.setScript('');
  })
  .then(() => {
    console.log('Saving');
    return app.doSave();
  })
  .then(() => {
    console.log('Fetching Table sample');
    return app.getLineage();
  })
  .then((appProperties) => {
    console.log('AppProperties', JSON.stringify(appProperties, undefined, '   '));
  })
  .then(() => {
    console.log('Fetching Table sample');
    return app.getTableData(-1, 50, true, 'Airports');
  })
  .then((tableData) => {
    if (tableData.length === 0) {
      return Promise.reject('Empty table response');
    }

    // Check if we can find one of the rows we know should be there.
    const firstRow = tableData.find(row => row.qValue[0].qNumber === 5871);
    if (!firstRow) {
      return Promise.reject('Could not find row with id 5871');
    }

    // Check if the contents of that row matches the expected.
    const firstRowAsString = firstRow.qValue.map(obj => obj.qText).reduce((a, b) => `${a}:${b}`);
    const expectedFirstRow = '5871:Moala Airport:Moala:Fiji:MFJ:NFMO:-18.5667:179.951:13:12:U:Pacific/Fiji';
    if (firstRowAsString.lastIndexOf(expectedFirstRow) !== 0) {
      return Promise.reject(`The check on the first row content was unsuccessful: ${firstRowAsString}`);
    }

    // Convert table grid into a string using some functional magic
    const tableDataAsString = tableData.map(row => row.qValue.map(value => value.qText).reduce((left, right) => `${left}\t${right}`)).reduce((row1, row2) => `${row1}\n${row2}`);
    console.log(tableDataAsString);
    return undefined;
  })
  .then(() => session.close())
  .then(() => console.log('Session closed'))
  .catch((err) => {
    console.log('Something went wrong :(', err);
    process.exit(1);
  });
