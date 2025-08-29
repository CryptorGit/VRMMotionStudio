const express = require('express');
const path = require('path');

const logger = require('./middleware/logger');
const routes = require('./routes');
const config = require('./config/config');

const app = express();
const { port, apiBasePath } = config;

app.use(express.json());
app.use(logger);
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(apiBasePath, routes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;
