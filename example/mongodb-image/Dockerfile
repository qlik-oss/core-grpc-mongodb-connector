FROM mongo:3.4
COPY ./airports.csv /
COPY ./init-test-data.sh /docker-entrypoint-initdb.d/
COPY ./add-test-user.js /docker-entrypoint-initdb.d/