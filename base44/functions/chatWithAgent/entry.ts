import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { agent_id, conversation_id, message } = await req.json();

    const agent = await base44.entities.Agent.get(agent_id);
    if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

    const settingsList = await base44.entities.AppSettings.list();
    const settings = settingsList[0] || {};

    const isGemini = agent.model && agent.model.startsWith('gemini');
    const isPerplexity = agent.model && agent.model.startsWith('sonar');
    const isClaude = agent.model && agent.model.startsWith('claude');
    const apiKey = isGemini ? settings.google_api_key : isPerplexity ? settings.perplexity_api_key : isClaude ? settings.anthropic_api_key : settings.openai_api_key;
    if (!apiKey) return Response.json({ error: `${isGemini ? 'Google' : isPerplexity ? 'Perplexity' : isClaude ? 'Anthropic' : 'OpenAI'} API key not configured. Please add it in Settings.` }, { status: 400 });

    let conversation;
    if (conversation_id) {
      conversation = await base44.entities.Conversation.get(conversation_id);
    } else {
      const recentConvs = await base44.entities.Conversation.filter({ agent_id: agent_id }, '-updated_date', 1);
      if (recentConvs.length > 0) {
        conversation = recentConvs[0];
      } else {
        conversation = await base44.entities.Conversation.create({
          title: message.substring(0, 50),
          agent_id: agent_id,
          messages: []
        });
      }
    }

    let memoryContext = '';
    if (agent.tools_enabled?.memory) {
      const memories = await base44.entities.Memory.filter({ agent_id: agent_id }, '-created_date', 5);
      memoryContext = memories.map(m => m.content).join('\n\n');
    }

    const systemContent = agent.system_prompt + (memoryContext ? '\n\nRelevant memory from past conversations:\n' + memoryContext : '');
    const chatMessages = [
      { role: 'system', content: systemContent },
      ...conversation.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const tools = [];
    if (agent.tools_enabled?.web_search) {
      tools.push({ type: 'function', function: { name: 'web_search', description: 'Search the web for current information', parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] } } });
    }
    if (agent.tools_enabled?.gmail_read) {
      tools.push({ type: 'function', function: { name: 'gmail_read', description: "Search and read emails from the user's Gmail account", parameters: { type: 'object', properties: { query: { type: 'string', description: 'Gmail search query' } }, required: ['query'] } } });
    }
    if (agent.tools_enabled?.gmail_send) {
      tools.push({ type: 'function', function: { name: 'gmail_send', description: "Send an email from the user's Gmail account", parameters: { type: 'object', properties: { to: { type: 'string', description: 'Recipient email address' }, subject: { type: 'string', description: 'Email subject' }, body: { type: 'string', description: 'Email body' } }, required: ['to', 'subject', 'body'] } } });
    }
    if (agent.tools_enabled?.drive_read) {
      tools.push({ type: 'function', function: { name: 'drive_read', description: "Search and read files from the user's Google Drive. Returns file names and extracted text content for documents, sheets, and slides.", parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query to find files in Google Drive' } }, required: ['query'] } } });
    }
    if (agent.tools_enabled?.fetch_url) {
      tools.push({ type: 'function', function: { name: 'fetch_url', description: 'Fetch and extract the full text content from a web page URL. Use this to read articles, papers, or documentation found via web search for deep research.', parameters: { type: 'object', properties: { url: { type: 'string', description: 'The full URL to fetch and read' } }, required: ['url'] } } });
    }

    const executeTool = async (name, args) => {
      if (name === 'web_search') return await doWebSearch(settings.google_api_key, settings.google_cse_id, args.query);
      if (name === 'gmail_read') return await doGmailRead(base44, args.query);
      if (name === 'gmail_send') return await doGmailSend(base44, args.to, args.subject, args.body);
      if (name === 'drive_read') return await doDriveRead(base44, args.query);
      if (name === 'fetch_url') return await doFetchUrl(args.url);
      return { error: 'Unknown tool' };
    };

    let assistantMessage;
    if (isGemini) {
      assistantMessage = await callGemini(apiKey, agent.model, chatMessages, tools, executeTool);
    } else if (isPerplexity) {
      assistantMessage = await callOpenAI(apiKey, agent.model, chatMessages, tools, executeTool, 'https://api.perplexity.ai/chat/completions');
    } else if (isClaude) {
      assistantMessage = await callClaude(apiKey, agent.model, chatMessages, tools, executeTool);
    } else {
      assistantMessage = await callOpenAI(apiKey, agent.model, chatMessages, tools, executeTool);
    }

    if (!assistantMessage) assistantMessage = 'I was unable to complete this request. Please try again.';

    const updatedMessages = [
      ...conversation.messages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date().toISOString() }
    ];
    await base44.entities.Conversation.update(conversation.id, { messages: updatedMessages });

    if (agent.tools_enabled?.memory) {
      try {
        const summaryMessages = [
          { role: 'system', content: 'Summarize the key facts, preferences, and context from this conversation exchange that would be useful to remember for future conversations. Be concise (2-3 sentences max).' },
          { role: 'user', content: `User: ${message}\nAssistant: ${assistantMessage}` }
        ];
        let summary;
        if (isGemini) {
          summary = await callGemini(apiKey, agent.model, summaryMessages, [], null);
        } else if (isPerplexity) {
          summary = await callOpenAI(apiKey, 'sonar-pro', summaryMessages, [], null, 'https://api.perplexity.ai/chat/completions');
        } else if (isClaude) {
          summary = await callClaude(apiKey, agent.model, summaryMessages, [], null);
        } else {
          summary = await callOpenAI(apiKey, 'gpt-4.1-mini', summaryMessages, [], null);
        }
        if (summary) {
          await base44.entities.Memory.create({ agent_id: agent_id, content: summary, conversation_id: conversation.id });
        }
      } catch (e) { /* memory generation failed, don't block */ }
    }

    return Response.json({ conversation_id: conversation.id, message: assistantMessage });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function callOpenAI(apiKey, model, messages, tools, executeTool, baseUrl) {
  let toolCallCount = 0;
  const maxToolCalls = 5;
  const chatMessages = [...messages];
  const url = baseUrl || 'https://api.openai.com/v1/chat/completions';

  while (toolCallCount < maxToolCalls) {
    const body = { model, messages: chatMessages };
    if (tools && tools.length > 0) { body.tools = tools; body.tool_choice = 'auto'; }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'OpenAI API error'); }

    const data = await res.json();
    const choice = data.choices[0];

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0 && executeTool) {
      chatMessages.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await executeTool(tc.function.name, args);
        chatMessages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      toolCallCount++;
    } else {
      return choice.message.content || '';
    }
  }
  return '';
}

async function callGemini(apiKey, model, messages, tools, executeTool) {
  const systemContent = messages[0]?.role === 'system' ? messages[0].content : '';
  const chatMessages = messages[0]?.role === 'system' ? messages.slice(1) : messages;

  const contents = chatMessages.map(m => {
    if (m.role === 'tool') {
      return { role: 'user', parts: [{ functionResponse: { name: m.tool_call_id || 'tool', response: { result: typeof m.content === 'string' ? JSON.parse(m.content) : m.content } } }] };
    } else if (m.role === 'assistant' && m.tool_calls) {
      return { role: 'model', parts: m.tool_calls.map(tc => ({ functionCall: { name: tc.function.name, args: JSON.parse(tc.function.arguments) } })) };
    } else if (m.role === 'assistant') {
      return { role: 'model', parts: [{ text: m.content || '' }] };
    } else {
      return { role: 'user', parts: [{ text: m.content || '' }] };
    }
  });

  const body = { contents, generationConfig: { temperature: 0.7 } };
  if (systemContent) body.systemInstruction = { parts: [{ text: systemContent }] };
  if (tools && tools.length > 0) {
    body.tools = [{ functionDeclarations: tools.map(t => ({ name: t.function.name, description: t.function.description, parameters: t.function.parameters })) }];
  }

  let toolCallCount = 0;
  const maxToolCalls = 5;

  while (toolCallCount < maxToolCalls) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Gemini API error'); }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate) return '';

    const parts = candidate.content?.parts || [];
    const functionCalls = parts.filter(p => p.functionCall);

    if (functionCalls.length > 0 && executeTool) {
      body.contents.push({ role: 'model', parts: functionCalls });
      for (const fc of functionCalls) {
        const result = await executeTool(fc.functionCall.name, fc.functionCall.args);
        body.contents.push({ role: 'user', parts: [{ functionResponse: { name: fc.functionCall.name, response: { result } } }] });
      }
      toolCallCount++;
    } else {
      return parts.map(p => p.text || '').join('');
    }
  }
  return '';
}

async function callClaude(apiKey, model, messages, tools, executeTool) {
  const systemContent = messages[0]?.role === 'system' ? messages[0].content : '';
  const chatMessages = messages[0]?.role === 'system' ? messages.slice(1) : messages;

  const claudeMessages = [];
  for (const m of chatMessages) {
    if (m.role === 'tool') {
      claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: m.tool_call_id, content: m.content }] });
    } else if (m.role === 'assistant' && m.tool_calls) {
      const content = [];
      if (m.content) content.push({ type: 'text', text: m.content });
      for (const tc of m.tool_calls) {
        content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input: JSON.parse(tc.function.arguments) });
      }
      claudeMessages.push({ role: 'assistant', content });
    } else if (m.role === 'assistant') {
      claudeMessages.push({ role: 'assistant', content: [{ type: 'text', text: m.content || '' }] });
    } else {
      claudeMessages.push({ role: 'user', content: [{ type: 'text', text: m.content || '' }] });
    }
  }

  const claudeTools = tools ? tools.map(t => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters })) : [];

  let toolCallCount = 0;
  const maxToolCalls = 5;

  while (toolCallCount < maxToolCalls) {
    const body = { model, max_tokens: 4096, messages: claudeMessages };
    if (systemContent) body.system = systemContent;
    if (claudeTools.length > 0) body.tools = claudeTools;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || 'Claude API error'); }

    const data = await res.json();
    const content = data.content || [];
    const toolUses = content.filter(c => c.type === 'tool_use');

    if (toolUses.length > 0 && executeTool) {
      claudeMessages.push({ role: 'assistant', content });
      for (const tu of toolUses) {
        const result = await executeTool(tu.name, tu.input);
        claudeMessages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(result) }] });
      }
      toolCallCount++;
    } else {
      return content.filter(c => c.type === 'text').map(c => c.text).join('');
    }
  }
  return '';
}

async function doWebSearch(googleApiKey, cseId, query) {
  if (!googleApiKey || !cseId) return { error: 'Google Search not configured. Add your Google API key and CSE ID in Settings.' };
  const url = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${cseId}&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return { error: 'Search failed' };
  const data = await res.json();
  return (data.items || []).slice(0, 5).map(item => ({ title: item.title, link: item.link, snippet: item.snippet }));
}

async function doGmailRead(base44, query) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`;
    const searchRes = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (!searchRes.ok) return { error: 'Failed to search Gmail' };
    const searchData = await searchRes.json();
    const messages = await Promise.all((searchData.messages || []).slice(0, 3).map(async (msg) => {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (!detailRes.ok) return null;
      const detail = await detailRes.json();
      const headers = detail.payload?.headers || [];
      return { subject: headers.find(h => h.name === 'Subject')?.value || '', from: headers.find(h => h.name === 'From')?.value || '', snippet: detail.snippet || '' };
    }));
    return messages.filter(m => m !== null);
  } catch (e) {
    return { error: 'Gmail not connected. Please connect Gmail in Settings.' };
  }
}

async function doGmailSend(base44, to, subject, body) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const email = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', 'MIME-Version: 1.0', '', body].join('\r\n');
    const encodedEmail = btoa(unescape(encodeURIComponent(email)));
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encodedEmail })
    });
    if (!res.ok) return { error: 'Failed to send email' };
    const data = await res.json();
    return { success: true, id: data.id };
  } catch (e) {
    return { error: 'Gmail not connected. Please connect Gmail in Settings.' };
  }
}

async function doDriveRead(base44, query) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("fullText contains '" + query + "' and trashed = false")}&fields=files(id,name,mimeType,modifiedTime)&pageSize=5&orderBy=modifiedTime desc`;
    const searchRes = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (!searchRes.ok) return { error: 'Failed to search Google Drive' };
    const searchData = await searchRes.json();

    const files = await Promise.all((searchData.files || []).slice(0, 3).map(async (file) => {
      const result = { name: file.name, mimeType: file.mimeType, modifiedTime: file.modifiedTime };
      if (file.mimeType === 'application/vnd.google-apps.document') {
        const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (exportRes.ok) result.content = (await exportRes.text()).substring(0, 3000);
      } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (exportRes.ok) result.content = (await exportRes.text()).substring(0, 3000);
      } else if (file.mimeType === 'application/vnd.google-apps.presentation') {
        const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (exportRes.ok) result.content = (await exportRes.text()).substring(0, 3000);
      } else if (file.mimeType.startsWith('text/') || file.mimeType === 'application/pdf') {
        const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (metaRes.ok) result.content = (await metaRes.text()).substring(0, 3000);
      }
      return result;
    }));
    return files.length > 0 ? files : { message: 'No files found matching the query' };
  } catch (e) {
    return { error: 'Google Drive not connected. Please connect Drive in Settings.' };
  }
}

async function doFetchUrl(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexusAI/1.0)', 'Accept': 'text/html,application/json' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { error: `Failed to fetch URL (status ${res.status})` };
    const contentType = res.headers.get('content-type') || '';
    let text;
    if (contentType.includes('application/json')) {
      text = JSON.stringify(await res.json(), null, 2);
    } else {
      const html = await res.text();
      text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    }
    return { url, content: text.substring(0, 6000) };
  } catch (e) {
    return { error: 'Failed to fetch URL: ' + e.message };
  }
}