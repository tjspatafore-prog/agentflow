import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GMAIL_CONNECTOR_ID = "6a37407d732644ada9c19c2f";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(GMAIL_CONNECTOR_ID);
      return Response.json({ connected: !!accessToken });
    } catch (e) {
      return Response.json({ connected: false });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});