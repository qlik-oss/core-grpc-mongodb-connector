# Example MongoDB GRPC Connector

*As of 1 July 2020, Qlik Core is no longer available to new customers. No further maintenance will be done in this repository.*

The Example MongoDB GRPC Connector shows how to load data into Qlik Associative Engine from MongoDB using a
dockerized connector built in Javascript. It streams the data using NodeJS streams though
the following components before sending it onto Qlik Associative Engine.
* mongo-client - reads the data from the database into reasonably sized json data chunks.
* mongo-to-grpc-transformer - takes the json data chunks and translates them into GRPC data chunks. The data is then sent straight into the GRPC output stream.

## Example

The `/example` directory defines a simple stack of services using docker-compose:
* Qlik Associative Engine
* MongoDB GRPC Connector
* MongoDB Database
* Node Test Runner (only used for automated testing)

The script in [example/reload-runner](example/reload-runner) is used to instruct Qlik Associative Engine to load the example
data (originally defined in [example/mongodb-image/airports.csv](example/mongodb-image/airports.csv))
using the connector.

### Steps to run the example

Run in a \*nix environment (or Git Bash if on Windows), note that you must accept the
[Qlik Core EULA](https://core.qlik.com/eula/) by setting the `ACCEPT_EULA`
environment variable:

```bash
$ cd example
$ ACCEPT_EULA=yes docker-compose up -d --build
$ cd reload-runner
$ npm install
$ npm start
```

## Contributing

We welcome and encourage contributions! Please read [Open Source at Qlik R&D](https://github.com/qlik-oss/open-source) for more info on how to get involved.
