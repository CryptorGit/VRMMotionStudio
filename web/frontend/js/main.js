import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';

const messageEl = document.getElementById('message');

fetch('/api/hello')
  .then((res) => res.json())
  .then((data) => {
    messageEl.textContent = data.message;
  })
  .catch((err) => {
    console.error('API error:', err);
  });

fetch('/api/users')
  .then((res) => res.json())
  .then((users) => {
    const list = document.getElementById('users');
    users.forEach((user) => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fa-solid fa-user"></i> ${user.name}`;
      list.appendChild(li);
    });
  })
  .catch((err) => {
    console.error('User API error:', err);
  });

const params = { color: '#333333' };
const gui = new GUI();
gui.addColor(params, 'color').name('文字色').onChange((value) => {
  messageEl.style.color = value;
});
