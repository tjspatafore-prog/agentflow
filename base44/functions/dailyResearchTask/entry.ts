import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

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
      agents = allAgents.filter(a => a.tools_enabled && a.tools_enabled.web_search === true);
    }

    if (agents.length === 0) {
      return Response.json({ message: 'No agents with web search enabled found.' });
    }

    let totalSaved = 0;
    const details = [];

    for (const agent of agents) {
      try {
        // Single LLM call with web search: generate 5 topics AND research them
        const researchResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are an autonomous research assistant. Based on the following AI agent's purpose and focus area, identify 5 timely and relevant research topics, then research each one using the latest information available online.

For each topic, provide: a clear topic title, a concise 2-3 sentence abstract, a detailed 2-3 paragraph full content summary with key findings, the primary source URL if available, and 2-4 relevant keyword tags.

Agent name: ${agent.name}
Role description: ${agent.role_description || 'N/A'}
System prompt: ${agent.system_prompt}

Return a JSON object with a "documents" array containing 5 research documents, each with fields: topic, abstract, full_content, source_url, tags.`,
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
          // Save full research document
          await base44.asServiceRole.entities.Research.create({
            topic: doc.topic || 'Untitled research',
            abstract: doc.abstract || '',
            full_content: doc.full_content || '',
            source_url: doc.source_url || '',
            tags: [...(doc.tags || []), 'auto-research', agent.name]
          });

          // Save concise memory for agent reference in future conversations
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