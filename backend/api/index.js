const app = require('../src/app');

// Local development: start the HTTP server when run directly
// Vercel imports this file (require.main !== module), so the listen block is skipped
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`MoneyMint API → http://localhost:${PORT}`);
  });
}

module.exports = app;
