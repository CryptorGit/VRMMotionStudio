const { users } = require('../models/userModel');

function getAllUsers() {
  return users;
}

module.exports = { getAllUsers };
