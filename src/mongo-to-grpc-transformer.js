const stream = require('stream');
const grpc = require('grpc');
const qlik = require('./qlik_grpc');
const ByteBuffer = require('bytebuffer');
const GRPC_CHUNK_SIZE = 100;

class MongoToGrpcTransformer extends stream.Transform {
  constructor(call) {
    super({ objectMode: true, writableObjectMode: true, readableObjectMode: true });
    this.call = call;
    this.headerSent = false;
    this.rows = [];
    this.fieldInfo = [];
  }

  _buildFieldInfo(firstChunk) {
    const fields = Object.keys(firstChunk).filter(name => typeof firstChunk[name] !== 'object').map(name => ({
      name,
      semanticType: 0,
      fieldAttributes: {
        Type: 1,
      },
    }));
    return fields;
  }

  _sendMetadata() {
    const dataResponse = new qlik.GetDataResponse({
      tableName: '',
      fieldInfo: this.fieldInfo,
    });
    const bytebuffer = new ByteBuffer();
    dataResponse.encode(bytebuffer);
    const metadata = new grpc.Metadata();
    metadata.set('x-qlik-getdata-bin', bytebuffer.buffer);
    this.call.sendMetadata(metadata);
  }

  _compileRowsToGrpcStructure() {
    const grpcChunk = {
      cols: new Array(this.fieldInfo.length),
    };

    for (let columnNbr = 0; columnNbr < this.fieldInfo.length; columnNbr++) {
      grpcChunk.cols[columnNbr] = {
        strings: new Array(this.rows.length),
      };
      const column = grpcChunk.cols[columnNbr];
      const columnFieldName = this.fieldInfo[columnNbr].name;
      for (let rowNbr = 0; rowNbr < this.rows.length; rowNbr++) {
        const row = this.rows[rowNbr];
        column.strings[rowNbr] = `${row[columnFieldName]}`;
      }
    }
    this.rows = [];
    return grpcChunk;
  }

  _transform(chunk, encoding, callback) {
    if (!this.headerSent) {
      this.fieldInfo = this._buildFieldInfo(chunk);
      this._sendMetadata();
      this.headerSent = true;
    }
    this.rows.push(chunk);

    if (this.rows.length >= GRPC_CHUNK_SIZE) {
      callback(null, this._compileRowsToGrpcStructure());
    } else {
      callback(null, null);
    }
  }

  _flush(callback) {
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
