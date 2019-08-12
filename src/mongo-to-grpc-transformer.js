const stream = require('stream');
const grpc = require('grpc');
const ByteBuffer = require('bytebuffer');
const qlik = require('./qlik_grpc');

const GRPC_CHUNK_SIZE = 100;

class MongoToGrpcTransformer extends stream.Transform {
  constructor(call, booleanType, projection) {
    super({ objectMode: true, writableObjectMode: true, readableObjectMode: true });
    this.call = call;
    this.headerSent = false;
    this.rows = [];
    this.fieldInfo = [];
    this.booleanType = booleanType || 'numeric';
    this.projection = projection;
  }

  _buildFieldInfo(firstChunk) {
    if (this.projection || firstChunk) {
      const fields = Object.keys(this.projection || firstChunk).map((name) => ({
        name,
        semanticType: 0,
        fieldAttributes: {
          Type: 0,
        },
      }));
      return fields;
    }

    return [];
  }

  _sendMetadata() {
    const dataResponse = new qlik.GetDataResponse({
      tableName: '',
      fieldInfo: this.fieldInfo,
    });
    const bytebuffer = new ByteBuffer(256);

    dataResponse.encode(bytebuffer);
    const metadata = new grpc.Metadata();
    metadata.set('x-qlik-getdata-bin', bytebuffer.flip().toBuffer());
    this.call.sendMetadata(metadata);
  }

  _compileRowsToGrpcStructure() {
    const grpcChunk = {
      stringBucket: [],
      doubleBucket: [],
      stringCodes: [],
      numberCodes: [],
    };

    for (let rowNbr = 0; rowNbr < this.rows.length; rowNbr += 1) {
      for (let columnNbr = 0; columnNbr < this.fieldInfo.length; columnNbr += 1) {
        const columnFieldName = this.fieldInfo[columnNbr].name;
        const value = this.rows[rowNbr][columnFieldName];
        if (typeof value === 'string') {
          grpcChunk.stringBucket.push(value); // Add the string value to the string bucket
          grpcChunk.stringCodes.push(grpcChunk.stringBucket.length - 1); // Point out the string value location
          grpcChunk.numberCodes.push(-1); // No numeric value
        } else if (typeof value === 'number') {
          grpcChunk.doubleBucket.push(value); // Add the number into the doubleBucket array
          grpcChunk.numberCodes.push(grpcChunk.doubleBucket.length - 1); // Point out the numeric value location
          grpcChunk.stringCodes.push(-1); // No string value
        } else if (typeof value === 'boolean' && this.booleanType === 'string') {
          grpcChunk.stringBucket.push(value ? 'True' : 'False'); // Add the string value to the string bucket
          grpcChunk.stringCodes.push(grpcChunk.stringBucket.length - 1); // Point out the string value location
          grpcChunk.numberCodes.push(-1); // No numeric value
        } else if (typeof value === 'boolean') {
          grpcChunk.numberCodes.push(-2); // Indicate that the value comes inline in the numberCodes array
          grpcChunk.numberCodes.push(value ? -1 : 0); // Add -1 for true and 0 for false
          grpcChunk.stringCodes.push(-1); // No string value
        } else {
          grpcChunk.stringBucket.push(`${value}`); // For other unknown types simply format it to a string as a fail safe
          grpcChunk.stringCodes.push(grpcChunk.stringBucket.length - 1); // Point out the string value location
          grpcChunk.numberCodes.push(-1); // No numeric value
        }
      }
    }
    this.rows = [];
    return grpcChunk;
  }

  _transform(chunk, encoding, callback) {
    this._checkHeaderSent(chunk);
    this.rows.push(chunk);

    if (this.rows.length >= GRPC_CHUNK_SIZE) {
      callback(null, this._compileRowsToGrpcStructure());
    } else {
      callback(null, null);
    }
  }

  _checkHeaderSent(chunk) {
    if (!this.headerSent) {
      this.fieldInfo = this._buildFieldInfo(chunk);
      this._sendMetadata();
      this.headerSent = true;
    }
  }

  _flush(callback) {
    // if the header has not been sent most likely no data was fetched
    // but we should still make sure the header is sent
    this._checkHeaderSent();
    if (this.rows.length >= 0) {
      callback(null, this._compileRowsToGrpcStructure());
    } else {
      callback(null, null);
    }
  }
}

module.exports = {
  MongoToGrpcTransformer,
};
