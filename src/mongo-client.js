const grpc = require('grpc');
const mongodb = require('mongodb');
const { MongoToGrpcTransformer } = require('./mongo-to-grpc-transformer');

class MongoClient {
  query(call) {
    const url = this._connectionInfoToMongoUrl(call.request.connection);
    try {
      const parameters = JSON.parse(call.request.parameters.statement);
      mongodb.MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
        if (err) {
          call.emit('error', this._grpcStatusError(err.message));
          call.end();
        } else {
          try {
            const collection = client.db().collection(parameters.collection);
            const cursor = collection.find(parameters.find || {}, parameters.options || {});
            cursor.on('close', () => {
              // we need to close the connection
              client.close();
            });
            const transformer = new MongoToGrpcTransformer(call, parameters.booleanType, parameters.options ? parameters.options.projection : null);
            transformer.pipe(call);
            cursor.pipe(transformer);
          } catch (error) {
            call.emit('error', this._grpcStatusError(error.message));
            call.end();
          }
        }
      });
    } catch (err) {
      call.emit('error', this._grpcStatusError(err.message));
      call.end();
    }
  }

  _grpcStatusError(message) {
    return {
      code: grpc.status.INVALID_ARGUMENT,
      message,
    };
  }

  _connectionInfoToMongoUrl(connection) {
    const connectionStringParams = this._connectionStringToParameterMap(connection.connectionString);
    const { user, password } = connection;
    const hostname = connectionStringParams.hostname || 'localhost';
    const port = connectionStringParams.port || '27017';
    const database = connectionStringParams.database || 'test';
    const url = `mongodb://${user}:${password}@${hostname}:${port}/${database}`;
    return url;
  }

  _connectionStringToParameterMap(connectionString) {
    const paramEntriesArray = connectionString.split(';');
    const result = paramEntriesArray.reduce((map, paramEntry) => {
      const keyAndValueArray = paramEntry.split('=');
      if (keyAndValueArray.length === 2) {
        map[keyAndValueArray[0].trim()] = keyAndValueArray[1].trim(); // eslint-disable-line
      }
      return map;
    }, {});
    return result;
  }
}

module.exports = {
  MongoClient,
};
