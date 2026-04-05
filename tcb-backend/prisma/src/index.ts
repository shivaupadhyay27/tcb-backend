import 'dotenv/config';
import app from './app';
import { handleMetrics } from './metrics.controller';
import './lib/sentry';
import { setupExpressErrorHandler } from '@sentry/node';

// ✅ 1. Sentry performance/error middleware
setupExpressErrorHandler(app);

// ✅ 2. Your logging middleware
app.use((req, res, next) => {
  console.log(`📌 ${req.method} ${req.url}`);
  next();
});

// ✅ 3. Routes
app.get('/metrics', handleMetrics);

// ✅ 4. Your custom error handler (LAST)
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

// ✅ 6. Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 TCB API running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
