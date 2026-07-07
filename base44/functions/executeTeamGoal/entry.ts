import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let artifactId = null;
  let base44 = null;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { team_id, goal: _goal, file_urls } = await req.json();
    let goal = _goal;

    // Process file attachments — extract text content and append to goal
    if (file_urls && file_urls.length > 0) {
      for (const fileUrl of file_urls) {
        const cleanUrl = fileUrl.split('?')[0];
        const ext = cleanUrl.split('.').pop().toLowerCase();
        const name = decodeURIComponent(cleanUrl.split('/').pop());
        if (['mp3', 'wav', 'ogg', 'oga', 'm4a', 'webm', 'mp4', 'mpeg', 'mpga', 'flac'].includes(ext)) {
          try {
            const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: fileUrl });
            goal += `\n\n[Transcribed audio: ${name}]\n${transcript}`;
          } catch (e) { goal += `\n\n[Audio file attached: ${name}]`; }
        } else if (['pdf', 'csv', 'xlsx', 'json', 'html', 'txt', 'md', 'doc', 'docx'].includes(ext)) {
          try {
            const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
              file_url: fileUrl,
              json_schema: { type: 'object', properties: { content: { type: 'string' } } }
            });
            if (extractResult.status === 'success' && extractResult.output) {
              const extracted = typeof extractResult.output === 'string' ? extractResult.output : (extractResult.output.content || JSON.stringify(extractResult.output));
              goal += `\n\n[File content: ${name}]\n${extracted.substring(0, 5000)}`;
            } else {
              goal += `\n\n[File attached: ${name}]`;
            }
          } catch (e) { goal += `\n\n[File attached: ${name}]`; }
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          goal += `\n\n[Image attached: ${name}]`;
        } else {
          goal += `\n\n[File attached: ${name}]`;
        }
      }
    }

    const team = await base44.entities.Team.get(team_id);
    if (!team) return Response.json({ error: 'Team not found' }, { status: 404 });

    const agents = await Promise.all(team.agent_ids.map(id => base44.entities.Agent.get(id)));

    const settingsList = await base44.entities.AppSettings.list();
    const settings = settingsList[0] || {};

    const hasOpenAI = !!settings.openai_api_key;
    const hasGemini = !!settings.google_api_key;
    if (!hasOpenAI && !hasGemini) return Response.json({ error: 'No API keys configured. Please add them in Settings.' }, { status: 400 });

    // Create Artifact record immediately for progress tracking
    const artifact = await base44.entities.Artifact.create({
      title: goal.substring(0, 80),
      goal: goal,
      team_id: team_id,
      team_name: team.name,
      content: '',
      status: 'in_progress',
      trace: []
    });
    artifactId = artifact.id;

    const conversation = await base44.entities.Conversation.create({
      title: goal.substring(0, 50),
      team_id: team_id,
      messages: [{ role: 'user', content: goal, timestamp: new Date().toISOString() }]
    });

    // Auto-retry loop: each attempt uses a progressively simpler/different strategy
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check if user cancelled before starting this attempt
      const current = await base44.entities.Artifact.get(artifactId);
      if (current.cancelled) {
        await base44.entities.Artifact.update(artifactId, { status: 'failed', content: 'Cancelled by user' });
        return Response.json({ error: 'Execution cancelled by user', artifact_id: artifactId });
      }

      let trace = [...(current.trace || [])];
      trace.push({
        step: attempt === 1 ? 'Start' : `Retry ${attempt}`,
        description: attempt === 1 ? 'Starting execution' : `Retrying with a different approach (attempt ${attempt} of ${maxAttempts})...`,
        status: 'running'
      });
      await base44.entities.Artifact.update(artifactId, { trace });

      try {
        const finalResponse = await executeAttempt(base44, agents, goal, settings, attempt, artifactId);

        // Success — finalize
        const latest = await base44.entities.Artifact.get(artifactId);
        trace = [...(latest.trace || [])];
        trace.push({ step: 'Complete', description: 'Goal accomplished', status: 'done' });

        await base44.entities.Conversation.update(conversation.id, {
          messages: [...conversation.messages, { role: 'assistant', content: finalResponse, timestamp: new Date().toISOString() }],
          summary: `Team goal: ${goal}`
        });

        await base44.entities.Artifact.update(artifactId, {
          content: finalResponse,
          status: 'completed',
          trace
        });

        return Response.json({ conversation_id: conversation.id, artifact_id: artifactId, final_response: finalResponse, trace });
      } catch (attemptError) {
        // If user cancelled mid-attempt, stop immediately
        if (attemptError.message === 'Cancelled by user') {
          await base44.entities.Artifact.update(artifactId, { status: 'failed', content: 'Cancelled by user' });
          return Response.json({ error: 'Execution cancelled by user', artifact_id: artifactId });
        }

        lastError = attemptError;
        const latest = await base44.entities.Artifact.get(artifactId);
        trace = [...(latest.trace || [])];
        trace.push({ step: `Attempt ${attempt}`, description: `Failed: ${attemptError.message}`, status: 'failed' });
        await base44.entities.Artifact.update(artifactId, { trace });

        // If not the last attempt, wait and check for cancellation before retrying
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 2000 * attempt));
          const checkCancel = await base44.entities.Artifact.get(artifactId);
          if (checkCancel.cancelled) {
            await base44.entities.Artifact.update(artifactId, { status: 'failed', content: 'Cancelled by user' });
            return Response.json({ error: 'Execution cancelled by user', artifact_id: artifactId });
          }
        }
      }
    }

    // All attempts exhausted
    await base44.entities.Artifact.update(artifactId, {
      status: 'failed',
      content: `Execution failed after ${maxAttempts} attempts. Last error: ${lastError?.message || 'Unknown error'}`
    });
    return Response.json({ error: lastError?.message || 'All attempts failed', artifact_id: artifactId }, { status: 500 });
  } catch (error) {
    if (artifactId && base44) {
      try {
        await base44.entities.Artifact.update(artifactId, {
          status: 'failed',
          content: `Execution failed: ${error.message}`
        });
      } catch (e) { /* best-effort */ }
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Execute one full attempt: decompose → execute subtasks → synthesize
// Strategy varies by attempt number for genuinely different retry approaches
async function executeAttempt(base44, agents, goal, settings, attempt, artifactId) {
  const hasOpenAI = !!settings.openai_api_key;
  const orchModel = hasOpenAI ? 'gpt-5.4' : 'gemini-2.5-flash-lite';
  const orchApiKey = hasOpenAI ? settings.openai_api_key : settings.google_api_key;
  const orchIsGemini = !hasOpenAI;

  // Strategy per attempt:
  // 1: Full decomposition + shared knowledge + each agent's configured model
  // 2: Skip shared knowledge (reduces context/tokens) + fallback to cheaper model on failure
  // 3: No decomposition — assign full goal directly to each agent, use cheapest available model
  const skipSharedKnowledge = attempt >= 2;
  const skipDecomposition = attempt >= 3;
  const useFallbackModels = attempt >= 2;

  // Initialize trace from the artifact so we append to existing history
  const currentArtifact = await base44.entities.Artifact.get(artifactId);
  let trace = [...(currentArtifact.trace || [])];
  const pushTrace = async (step) => {
    trace.push(step);
    await base44.entities.Artifact.update(artifactId, { trace });
  };

  // Build shared knowledge context (skip on retries to reduce context size)
  let sharedLibrary = '';
  if (!skipSharedKnowledge) {
    try {
      const knowledgeFiles = await base44.entities.SharedKnowledgeBase.list('-created_date', 10);
      if (knowledgeFiles.length > 0) {
        sharedLibrary = '\n\nSHARED KNOWLEDGE LIBRARY (accessible reference materials — cite and use these as needed):\n' +
          knowledgeFiles.map(k => `- ${k.title}${k.description ? ': ' + k.description : ''}${k.tags && k.tags.length ? ' [' + k.tags.join(', ') + ']' : ''} — ${k.file_url}`).join('\n');
      }
    } catch (e) { /* shared knowledge unavailable */ }
  }

  let subtasks;
  if (skipDecomposition) {
    // Attempt 3+: skip the orchestrator entirely, assign the full goal to each agent
    subtasks = agents.map(a => ({ agent_name: a.name, task: goal, context: '' }));
    await pushTrace({ step: 'Plan', description: `Attempt ${attempt}: Assigned full goal directly to all ${agents.length} agents (no decomposition)`, subtasks: subtasks.map(s => ({ agent: s.agent_name, task: 'Full goal' })) });
  } else {
    // Decompose
    const agentDescriptions = agents.map((a, i) => `Agent ${i + 1}: ${a.name} - ${a.role_description}`).join('\n');
    const decomposeMessages = [
      { role: 'system', content: 'You are a task orchestrator. Given a goal and a team of agents, decompose the goal into sub-tasks and assign each to the most appropriate agent. Return JSON with a "subtasks" array, each having "agent_name", "task", and "context" fields.' },
      { role: 'user', content: `Goal: ${goal}\n\nAvailable agents:\n${agentDescriptions}` }
    ];

    let decomposeText;
    if (orchIsGemini) {
      decomposeText = await callWithRetry(() => callGeminiSimple(orchApiKey, orchModel, decomposeMessages));
    } else {
      decomposeText = await callWithRetry(() => callOpenAISimple(orchApiKey, orchModel, decomposeMessages, true));
    }

    try {
      const parsed = JSON.parse(decomposeText);
      subtasks = parsed.subtasks || parsed.tasks || [];
      if (!Array.isArray(subtasks)) subtasks = [subtasks];
    } catch (e) {
      subtasks = agents.map(a => ({ agent_name: a.name, task: goal, context: '' }));
    }

    await pushTrace({ step: 'Plan', description: `Attempt ${attempt}: Decomposed goal into ${subtasks.length} sub-tasks${skipSharedKnowledge ? ' (reduced context)' : ''}`, subtasks: subtasks.map(s => ({ agent: s.agent_name, task: s.task })) });
  }

  // Execute each sub-task
  const results = [];
  for (const subtask of subtasks) {
    // Check if user cancelled between subtasks
    const checkCancel = await base44.entities.Artifact.get(artifactId);
    if (checkCancel.cancelled) throw new Error('Cancelled by user');

    const agent = agents.find(a => a.name === subtask.agent_name) || agents[0];
    await pushTrace({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'running' });

    let agentResult;
    try {
      agentResult = await callAgentLLM(agent, settings, subtask, goal, sharedLibrary, useFallbackModels);
    } catch (agentError) {
      await pushTrace({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'failed', preview: agentError.message });
      throw new Error(`Agent "${agent.name}" failed: ${agentError.message}`);
    }

    results.push({ agent: agent.name, task: subtask.task, result: agentResult });
    await pushTrace({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'done', preview: agentResult.substring(0, 150) });
  }

  // Synthesize
  await pushTrace({ step: 'Synthesize', description: 'Combining all agent results...', status: 'running' });

  const synthesisInput = results.map(r => `Agent: ${r.agent}\nTask: ${r.task}\nResult: ${r.result}`).join('\n\n---\n\n');
  const synthMessages = [
    { role: 'system', content: 'You are a synthesis agent. Combine the results from multiple agents into a cohesive, well-structured final response that addresses the original goal. Use markdown formatting.' },
    { role: 'user', content: `Original goal: ${goal}\n\nAgent results:\n${synthesisInput}` }
  ];

  let finalResponse;
  if (orchIsGemini) {
    finalResponse = await callWithRetry(() => callGeminiSimple(orchApiKey, orchModel, synthMessages));
  } else {
    finalResponse = await callWithRetry(() => callOpenAISimple(orchApiKey, orchModel, synthMessages, false));
  }

  await pushTrace({ step: 'Synthesize', description: 'Combined all agent results into final response', status: 'done' });

  return finalResponse;
}

// Call an LLM with the agent's configured model; on attempt 2+, fall back to a cheaper model if it fails
async function callAgentLLM(agent, settings, subtask, goal, sharedLibrary, useFallbackModels) {
  const agentMessages = [
    { role: 'system', content: agent.system_prompt + sharedLibrary },
    { role: 'user', content: `Task: ${subtask.task}\n${subtask.context ? 'Context: ' + subtask.context : ''}\n\nOverall goal: ${goal}` }
  ];

  const isGemini = agent.model && agent.model.startsWith('gemini');
  const isPerplexity = agent.model && agent.model.startsWith('sonar');
  const isClaude = agent.model && agent.model.startsWith('claude');
  const agentApiKey = isGemini ? settings.google_api_key : isPerplexity ? settings.perplexity_api_key : isClaude ? settings.anthropic_api_key : settings.openai_api_key;

  // Try the agent's configured model first (with per-call retry)
  if (agentApiKey) {
    try {
      if (isGemini) return await callWithRetry(() => callGeminiSimple(agentApiKey, agent.model, agentMessages));
      if (isPerplexity) return await callWithRetry(() => callOpenAISimple(agentApiKey, agent.model, agentMessages, false, 'https://api.perplexity.ai/chat/completions'));
      if (isClaude) return await callWithRetry(() => callClaudeSimple(agentApiKey, agent.model, agentMessages));
      return await callWithRetry(() => callOpenAISimple(agentApiKey, agent.model, agentMessages, false));
    } catch (e) {
      // On attempt 1, throw to trigger a full retry. On attempt 2+, fall through to fallback.
      if (!useFallbackModels) throw e;
    }
  }

  // Fallback to the cheapest reliable model available
  if (settings.openai_api_key) {
    return await callWithRetry(() => callOpenAISimple(settings.openai_api_key, 'gpt-4.1-mini', agentMessages, false));
  }
  if (settings.google_api_key) {
    return await callWithRetry(() => callGeminiSimple(settings.google_api_key, 'gemini-2.5-flash-lite', agentMessages));
  }
  throw new Error(`${isGemini ? 'Google' : isPerplexity ? 'Perplexity' : isClaude ? 'Anthropic' : 'OpenAI'} API key not configured`);
}

// Retry a function call with exponential backoff (handles transient API failures)
async function callWithRetry(fn, maxRetries = 1) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < maxRetries) await new Promise(r => setTimeout(r, 3000 * (i + 1)));
    }
  }
  throw lastError;
}

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

async function callClaudeSimple(apiKey, model, messages) {
  const systemContent = messages[0]?.role === 'system' ? messages[0].content : '';
  const chatMessages = messages[0]?.role === 'system' ? messages.slice(1) : messages;
  const claudeMessages = chatMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: [{ type: 'text', text: m.content || '' }] }));
  const body = { model, max_tokens: 4096, messages: claudeMessages };
  if (systemContent) body.system = systemContent;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Claude API error'); }
  const data = await res.json();
  return (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
}