const clients = require('../data/clients.json');

exports.getAll = (req, res) => {
  let result = [...clients];
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    result = result.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }
  res.json(result);
};

exports.getOne = (req, res) => {
  const c = clients.find(c => c.id === req.params.id);
  c ? res.json(c) : res.status(404).json({ error: 'Client not found' });
};
