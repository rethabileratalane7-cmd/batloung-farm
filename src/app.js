const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const logger = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(logger);

app.use('/api', require('./routes'));
app.use('/api', notFound);

// Frontend (static pages in ../frontend). Optional: the frontend can also be hosted separately.
const frontendDir = path.join(__dirname, '..', '..', 'frontend');
if (fs.existsSync(frontendDir)) app.use(express.static(frontendDir));

app.use(errorHandler);
module.exports = app;
