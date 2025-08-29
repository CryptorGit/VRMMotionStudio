class User {
  constructor(id, name) {
    this.id = id;
    this.name = name;
  }
}

const users = [
  new User(1, '初音ミク'),
  new User(2, '鏡音リン'),
  new User(3, '鏡音レン')
];

module.exports = { User, users };
