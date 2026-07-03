import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const targetAgentId = body.agent_id;

    // Determine which agents to research for
    let agents = [];
    if (targetAgentId) {
      const agent = await base44.asServiceRole.entities.Agent.get(targetAgentId);
      agents = [agent];
    } else {
      const allAgents = await base44.asServiceRole.entities.Agent.list();
      const enabledAgents = allAgents.filter(a => a.research_config && a.research_config.enabled === true);

      // When running via schedule (no agent_id), check each agent's configured report_time
      // The automation runs hourly; only process agents whose time matches the current hour
      const now = new Date();
      // Convert current UTC hour to Denver timezone (UTC-6)
      const denverOffset = -6;
      let denverHour = now.getUTCHours() + denverOffset;
      if (denverHour < 0) denverHour += 24;
      const currentHour = denverHour;

      agents = enabledAgents.filter(a => {
        const reportTime = a.research_config.report_time || '07:00';
        const agentHour = parseInt(reportTime.split(':')[0]);
        return agentHour === currentHour;
      });

      // If no agents match this hour, exit early
      if (agents.length === 0) {
        return Response.json({ message: 'No agents scheduled for this hour.', checked: enabledAgents.length, current_hour_denver: currentHour });
      }
    }

    if (agents.length === 0) {
      return Response.json({ message: 'No agents with autonomous research enabled.' });
    }

    let totalSaved = 0;
    const details = [];

    for (const agent of agents) {
      try {
        const config = agent.research_config || {};
        const docCount = Math.min(Math.max(config.document_count || 5, 1), 20);
        const focusTopics = config.focus_topics || '';

        const focusInstruction = focusTopics
          ? `\n\nThe user has specified these focus topics/tags for research: ${focusTopics}. Prioritize these themes when selecting topics.`
          : '';

        // Single LLM call with web search: generate and research all documents
        const researchResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are an autonomous research assistant. Based on the following AI agent's purpose and focus area, identify ${docCount} timely and relevant research topics, then research each one using the latest information available online.

For each topic, provide: a clear topic title, a concise 2-3 sentence abstract, a detailed 2-3 paragraph full content summary with key findings, the primary source URL if available, and 2-4 relevant keyword tags.

Agent name: ${agent.name}
Role description: ${agent.role_description || 'N/A'}
System prompt: ${agent.system_prompt}
Return exactly ${docCount} documents.${focusInstruction}

Return a JSON object with a "documents" array containing ${docCount} research documents, each with fields: topic, abstract, full_content, source_url, tags.`,
          add_context_from_internet: true,
          model: "gemini_3_flash",
          response_json_schema: {
            type: "object",
            properties: {
              documents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    topic: { type: "string" },
                    abstract: { type: "string" },
                    full_content: { type: "string" },
                    source_url: { type: "string" },
                    tags: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        });

        const documents = researchResponse.documents || [];
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        for (const doc of documents) {
          await base44.asServiceRole.entities.Research.create({
            topic: doc.topic || 'Untitled research',
            abstract: doc.abstract || '',
            full_content: doc.full_content || '',
            source_url: doc.source_url || '',
            tags: [...(doc.tags || []), 'auto-research', agent.name],
            agent_name: agent.name,
            is_auto: true
          });

          await base44.asServiceRole.entities.Memory.create({
            agent_id: agent.id,
            content: `Daily research (${today}): ${doc.topic || 'Untitled'}. ${doc.abstract || ''}`
          });

          totalSaved++;
        }

        details.push({ agent: agent.name, documents: documents.length, success: true });
      } catch (err) {
        details.push({ agent: agent.name, success: false, error: err.message });
      }
    }

    return Response.json({
      success: true,
      agents_researched: agents.length,
      documents_saved: totalSaved,
      details
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});