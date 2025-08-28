const express = require('express');
const path = require('path');

const logger = require('./middleware/logger');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(logger);
app.use(express.static(path.join(__dirname, '../public')));
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
