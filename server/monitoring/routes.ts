import { Router } from 'express';
import { runHealthCheck, getMonitorState, getMonitorHistory } from './crash-monitor.js';

export const monitoringRouter = Router();

monitoringRouter.get('/health', async (_req, res) => {
  try {
    const result = await runHealthCheck();
    const httpStatus = result.status === 'down' ? 503 : result.status === 'degraded' ? 207 : 200;
    res.status(httpStatus).json(result);
  } catch (e: any) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

monitoringRouter.get('/status', (_req, res) => {
  res.json(getMonitorState());
});

monitoringRouter.get('/history', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  res.json({ history: await getMonitorHistory(limit) });
});
