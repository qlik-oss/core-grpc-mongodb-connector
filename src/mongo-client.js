const mongodb = require('mongodb');

class MongoClient {
  query(req, callbackstream) {
    const url = this._connectionInfoToMongoUrl(req.connection);
    const parameters = JSON.parse(req.parameters.statement);
    mongodb.MongoClient.connect(url, (err, db) => {
      if (err) {
        console.log(url);
        console.log(err);
        callbackstream.end();
      } else {
        const collection = db.collection(parameters.collection);
        const cursor = collection.find(parameters.find || {});
        cursor.pipe(callbackstream);
      }
    });
  }

  _connectionInfoToMongoUrl(connection) {
    const connectionStringParams = this._connectionStringToParameterMap(connection.connectionString);
    const user = connection.user;
    const password = connection.password;
    const hostname = connectionStringParams.hostname || 'localhost';
    const port = connectionStringParams.port || '27017';
    const database = connectionStringParams.database || 'test';
    const url = `mongodb://${user}:${password}@${hostname}:27017/${database}`;
    return url;
  }

  _connectionStringToParameterMap(connectionString) {
    const paramEntriesArray = connectionString.split(';');
    const result = paramEntriesArray.reduce((map, paramEntry) => {
      const keyAndValueArray = paramEntry.split('=');
      if (keyAndValueArray.length == 2) {
        map[keyAndValueArray[0].trim()] = keyAndValueArray[1].trim();
      }
      return map;
    }, {});
    return result;
  }
}

module.exports = {
  MongoClient,
};
