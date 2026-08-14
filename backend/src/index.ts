import app from './app';

const PORT = parseInt(process.env.BACKEND_PORT || '4000', 10);

app.listen(PORT, () => {
  console.log(`\n🚀 Zansphere HR Portal API running at http://localhost:${PORT}`);
  console.log(`📚 API base: http://localhost:${PORT}/api/v1`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});
