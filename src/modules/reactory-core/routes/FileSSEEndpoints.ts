import { Application, Response } from 'express';
import { FileSSETransportManager } from '@reactory/server-modules/reactory-core/services/FileSSETransportManager';

/**
 * HTTP endpoints for the `<File />` SSE channel.
 *
 * Routes:
 *  - GET  /reactory/files/sse/:sessionId         attach an SSE transport
 *  - POST /reactory/files/sse/:sessionId/close   explicit close (best-effort)
 */
export class FileSSEEndpoints {
  static setupRoutes(app: Application): void {
    app.get('/reactory/files/sse/:sessionId', this.handleAttach.bind(this));
    app.post('/reactory/files/sse/:sessionId/close', this.handleClose.bind(this));
  }

  static async handleAttach(req: Reactory.Server.ReactoryExpressRequest, res: Response): Promise<void> {
    const { context } = req;
    const manager = context.getService<FileSSETransportManager>('core.FileSSETransportManager@1.0.0');
    const { sessionId } = req.params;
    const token = String(
      (req.query.token as string | undefined) ??
      (req.headers['x-file-sse-token'] as string | undefined) ??
      ''
    );

    try {
      await manager.attachTransport(sessionId, token, res);
    } catch (err: any) {
      const code = err?.meta?.code ?? 'ATTACH_ERROR';
      const status =
        code === 'UNAUTHORIZED' ? 401 :
        code === 'TOKEN_EXPIRED' ? 401 :
        code === 'UNKNOWN_SESSION' ? 404 : 500;

      if (!res.headersSent) {
        res.status(status).json({ error: code, message: err?.message });
      } else {
        try {
          res.write(`event: error\ndata: ${JSON.stringify({ code, message: err?.message })}\n\n`);
          res.end();
        } catch { /* ignore */ }
      }
    }
  }

  static async handleClose(req: Reactory.Server.ReactoryExpressRequest, res: Response): Promise<void> {
    const { context } = req;
    const manager = context.getService<FileSSETransportManager>('core.FileSSETransportManager@1.0.0');
    const { sessionId } = req.params;
    try {
      await manager.closeSession(sessionId);
      res.json({ ok: true, sessionId });
    } catch (err: any) {
      res.status(500).json({ error: 'CLOSE_ERROR', message: err?.message });
    }
  }
}

export default FileSSEEndpoints;
