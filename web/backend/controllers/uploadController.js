function handleUpload(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'ファイルがありません' });
  }
  res.json({
    filename: req.file.originalname,
    size: req.file.size
  });
}

module.exports = { handleUpload };
