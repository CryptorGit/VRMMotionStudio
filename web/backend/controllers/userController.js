const { getAllUsers } = require('../services/userService');

function getUsers() {
  return getAllUsers();
}

module.exports = { getUsers };
