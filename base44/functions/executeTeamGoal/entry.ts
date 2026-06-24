import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { team_id, goal } = await req.json();

    const team = await base44.entities.Team.get(team_id);
    if (!team) return Response.json({ error: 'Team not found' }, { status: 404 });

    const agents = await Promise.all(team.agent_ids.map(id => base44.entities.Agent.get(id)));

    const settingsList = await base44.entities.AppSettings.list();
    const settings = settingsList[0] || {};

    const hasOpenAI = !!settings.openai_api_key;
    const hasGemini = !!settings.google_api_key;
    if (!hasOpenAI && !hasGemini) return Response.json({ error: 'No API keys configured. Please add them in Settings.' }, { status: 400 });

    const orchIsGemini = !hasOpenAI;
    const orchModel = hasOpenAI ? 'gpt-4o' : 'gemini-2.0-flash';
    const orchApiKey = hasOpenAI ? settings.openai_api_key : settings.google_api_key;

    const conversation = await base44.entities.Conversation.create({
      title: goal.substring(0, 50),
      team_id: team_id,
      messages: [{ role: 'user', content: goal, timestamp: new Date().toISOString() }]
    });

    const trace = [];

    // Step 1: Decompose
    const agentDescriptions = agents.map((a, i) => `Agent ${i + 1}: ${a.name} - ${a.role_description}`).join('\n');
    const decomposeMessages = [
      { role: 'system', content: 'You are a task orchestrator. Given a goal and a team of agents, decompose the goal into sub-tasks and assign each to the most appropriate agent. Return JSON with a "subtasks" array, each having "agent_name", "task", and "context" fields.' },
      { role: 'user', content: `Goal: ${goal}\n\nAvailable agents:\n${agentDescriptions}` }
    ];

    let decomposeText;
    if (orchIsGemini) {
      decomposeText = await callGeminiSimple(orchApiKey, orchModel, decomposeMessages);
    } else {
      decomposeText = await callOpenAISimple(orchApiKey, orchModel, decomposeMessages, true);
    }

    let subtasks;
    try {
      const parsed = JSON.parse(decomposeText);
      subtasks = parsed.subtasks || parsed.tasks || [];
      if (!Array.isArray(subtasks)) subtasks = [subtasks];
    } catch (e) {
      subtasks = agents.map(a => ({ agent_name: a.name, task: goal, context: '' }));
    }

    trace.push({ step: 'Plan', description: `Decomposed goal into ${subtasks.length} sub-tasks`, subtasks: subtasks.map(s => ({ agent: s.agent_name, task: s.task })) });

    // Step 2: Execute each sub-task
    const results = [];
    for (const subtask of subtasks) {
      const agent = agents.find(a => a.name === subtask.agent_name) || agents[0];
      trace.push({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'running' });

      const isGemini = agent.model && agent.model.startsWith('gemini');
      const isPerplexity = agent.model && agent.model.startsWith('sonar');
      const agentApiKey = isGemini ? settings.google_api_key : isPerplexity ? settings.perplexity_api_key : settings.openai_api_key;

      if (!agentApiKey) {
        results.push({ agent: agent.name, task: subtask.task, result: `Error: ${isGemini ? 'Google' : isPerplexity ? 'Perplexity' : 'OpenAI'} API key not configured` });
        trace.push({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'done', preview: 'API key not configured' });
        continue;
      }

      const agentMessages = [
        { role: 'system', content: agent.system_prompt },
        { role: 'user', content: `Task: ${subtask.task}\n${subtask.context ? 'Context: ' + subtask.context : ''}\n\nOverall goal: ${goal}` }
      ];

      let agentResult;
      if (isGemini) {
        agentResult = await callGeminiSimple(agentApiKey, agent.model, agentMessages);
      } else if (isPerplexity) {
        agentResult = await callOpenAISimple(agentApiKey, agent.model, agentMessages, false, 'https://api.perplexity.ai/chat/completions');
      } else {
        agentResult = await callOpenAISimple(agentApiKey, agent.model, agentMessages, false);
      }

      results.push({ agent: agent.name, task: subtask.task, result: agentResult });
      trace.push({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'done', preview: agentResult.substring(0, 150) });
    }

    // Step 3: Synthesize
    const synthesisInput = results.map(r => `Agent: ${r.agent}\nTask: ${r.task}\nResult: ${r.result}`).join('\n\n---\n\n');
    const synthMessages = [
      { role: 'system', content: 'You are a synthesis agent. Combine the results from multiple agents into a cohesive, well-structured final response that addresses the original goal. Use markdown formatting.' },
      { role: 'user', content: `Original goal: ${goal}\n\nAgent results:\n${synthesisInput}` }
    ];

    let finalResponse;
    if (orchIsGemini) {
      finalResponse = await callGeminiSimple(orchApiKey, orchModel, synthMessages);
    } else {
      finalResponse = await callOpenAISimple(orchApiKey, orchModel, synthMessages, false);
    }

    await base44.entities.Conversation.update(conversation.id, {
      messages: [...conversation.messages, { role: 'assistant', content: finalResponse, timestamp: new Date().toISOString() }],
      summary: `Team goal: ${goal}`
    });

    trace.push({ step: 'Synthesize', description: 'Combined all agent results into final response' });

    return Response.json({ conversation_id: conversation.id, final_response: finalResponse, trace });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function callOpenAISimple(apiKey, model, messages, jsonMode, baseUrl) {
  const body = { model, messages };
  if (jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch(baseUrl || 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'OpenAI API error'); }
  const data = await res.json();
  return data.choices[0].message.content || '';
}

async function callGeminiSimple(apiKey, model, messages) {
  const systemContent = messages[0]?.role === 'system' ? messages[0].content : '';
  const chatMessages = messages[0]?.role === 'system' ? messages.slice(1) : messages;
  const contents = chatMessages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content || '' }] }));
  const body = { contents, generationConfig: { temperature: 0.7 } };
  if (systemContent) body.systemInstruction = { parts: [{ text: systemContent }] };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Gemini API error'); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
}