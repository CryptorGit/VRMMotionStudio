const express = require('express');
const { getHello } = require('../controllers/helloController');
const userRoutes = require('./userRoutes');
const uploadRoutes = require('./uploadRoutes');

const router = express.Router();

router.get('/hello', (req, res) => {
  res.json({ message: getHello() });
});

router.use('/users', userRoutes);
router.use('/upload', uploadRoutes);

router.post('/log', (req, res) => {
  console.log('Client log:', req.body);
  res.status(204).end();
});

module.exports = router;
