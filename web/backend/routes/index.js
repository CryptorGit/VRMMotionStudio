const express = require('express');
const { getHello } = require('../controllers/helloController');
const userRoutes = require('./userRoutes');

const router = express.Router();

router.get('/hello', (req, res) => {
  res.json({ message: getHello() });
});

router.use('/users', userRoutes);

module.exports = router;
