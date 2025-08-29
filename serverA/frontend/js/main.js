fetch('/api/hello')
  .then((res) => res.json())
  .then((data) => {
    document.getElementById('message').textContent = data.message;
  })
  .catch((err) => {
    console.error('API error:', err);
  });
