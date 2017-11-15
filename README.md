# Example MongoDB GRPC Connector

The Example MongoDB GRPC Connector shows how to load data into QIX Engine from MongoDB using a
dockerized connector built in Javascript. It streams the data using nodejs streams though
the following components before sending it onto QIX Engine.
* mongo-client - reads the data from the database into reasonably sized json data chunks.
* mongo-to-grpc-transformer - takes the json data chunks and translates them into grpc data chunks. The data is then sent straight into the grpc output stream.

## Example

The `/example` directory defines a simple stack of services using docker-compose:
* QIX Engine
* MongoDB GRPC Connector
* MongoDB Database
* Node Test Runner (only used for automated testing)

The script in [example/reload-runner](example/reload-runner) is used to instruct QIX Engine to load the example
data (originally defined in [example/mongodb-image/airports.csv](example/mongodb-image/airports.csv))
using the connector.

### Steps to run the example

Run in a \*nix environment (or Git Bash if on Windows):

```bash
$ cd example
$ docker-compose up -d --build
$ cd reload-runner
$ npm install
$ npm start
```
