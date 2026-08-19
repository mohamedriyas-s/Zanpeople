import app from './app';
import { env } from './config/env';

const PORT = env.BACKEND_PORT;

// Fix for Prisma BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

app.listen(PORT, () => {
  console.log(`🚀 Zansphere HR Portal API running on port ${PORT}`);
  console.log(`📋 Health check: ${env.BACKEND_URL}/api/v1/health`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);
});
