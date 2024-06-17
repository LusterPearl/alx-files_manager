// server.js
const express = require('express');
const bodyParser = require('body-parser');
const routes = require('./routes');
const redisClient = require('./utils/redis');
const dbClient = require('./utils/db');

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());
app.use('/', routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
