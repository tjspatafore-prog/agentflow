import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const agentName = url.searchParams.get('agent_name');
    const onlyAuto = url.searchParams.get('auto') === 'true';

    // Build query filter
    const filter = {};
    if (agentName) filter.agent_name = agentName;
    if (onlyAuto) filter.is_auto = true;

    let items;
    if (Object.keys(filter).length > 0) {
      items = await base44.asServiceRole.entities.Research.filter(filter, '-created_date', 500);
    } else {
      items = await base44.asServiceRole.entities.Research.list('-created_date', 500);
    }

    // Build a manifest as plain text for download
    let manifest = `AUTO-RESEARCH MANIFEST\nGenerated: ${new Date().toISOString()}\nTotal Documents: ${items.length}\n${'='.repeat(60)}\n\n`;

    for (const item of items) {
      manifest += `Title: ${item.topic}\n`;
      manifest += `Agent: ${item.agent_name || 'N/A'}\n`;
      manifest += `Date: ${item.created_date || 'N/A'}\n`;
      manifest += `Source: ${item.source_url || 'N/A'}\n`;
      manifest += `Tags: ${(item.tags || []).join(', ') || 'N/A'}\n`;
      manifest += `Auto-generated: ${item.is_auto ? 'Yes' : 'No'}\n`;
      manifest += `\nAbstract:\n${item.abstract || 'N/A'}\n`;
      manifest += `\nFull Content:\n${item.full_content || 'N/A'}\n`;
      manifest += `\n${'-'.repeat(60)}\n\n`;
    }

    return new Response(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="research-manifest-${Date.now()}.txt"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});