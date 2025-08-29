const express = require('express');
const { getUsers } = require('../controllers/userController');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(getUsers());
});

module.exports = router;
