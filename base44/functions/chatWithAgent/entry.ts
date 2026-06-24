import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const GMAIL_CONNECTOR_ID = "6a37407d732644ada9c19c2f";

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
    const apiKey = settings.openai_api_key;
    if (!apiKey) return Response.json({ error: 'OpenAI API key not configured. Please add it in Settings.' }, { status: 400 });

    let conversation;
    if (conversation_id) {
      conversation = await base44.entities.Conversation.get(conversation_id);
    } else {
      conversation = await base44.entities.Conversation.create({
        title: message.substring(0, 50),
        agent_id: agent_id,
        messages: []
      });
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
      tools.push({
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for current information',
          parameters: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] }
        }
      });
    }
    if (agent.tools_enabled?.gmail_read) {
      tools.push({
        type: 'function',
        function: {
          name: 'gmail_read',
          description: "Search and read emails from the user's Gmail account",
          parameters: { type: 'object', properties: { query: { type: 'string', description: 'Gmail search query' } }, required: ['query'] }
        }
      });
    }
    if (agent.tools_enabled?.gmail_send) {
      tools.push({
        type: 'function',
        function: {
          name: 'gmail_send',
          description: "Send an email from the user's Gmail account",
          parameters: {
            type: 'object',
            properties: {
              to: { type: 'string', description: 'Recipient email address' },
              subject: { type: 'string', description: 'Email subject' },
              body: { type: 'string', description: 'Email body' }
            },
            required: ['to', 'subject', 'body']
          }
        }
      });
    }

    let assistantMessage = '';
    let toolCallCount = 0;
    const maxToolCalls = 5;

    while (toolCallCount < maxToolCalls) {
      const body = { model: agent.model, messages: chatMessages };
      if (tools.length > 0) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!openaiRes.ok) {
        const err = await openaiRes.json();
        return Response.json({ error: err.error?.message || 'OpenAI API error' }, { status: openaiRes.status });
      }

      const data = await openaiRes.json();
      const choice = data.choices[0];

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        chatMessages.push(choice.message);

        for (const toolCall of choice.message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          let result;

          if (toolCall.function.name === 'web_search') {
            result = await doWebSearch(settings.google_api_key, settings.google_cse_id, args.query);
          } else if (toolCall.function.name === 'gmail_read') {
            result = await doGmailRead(base44, args.query);
          } else if (toolCall.function.name === 'gmail_send') {
            result = await doGmailSend(base44, args.to, args.subject, args.body);
          } else {
            result = { error: 'Unknown tool' };
          }

          chatMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
        }
        toolCallCount++;
      } else {
        assistantMessage = choice.message.content;
        break;
      }
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
        const summaryRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'Summarize the key facts, preferences, and context from this conversation exchange that would be useful to remember for future conversations. Be concise (2-3 sentences max).' },
              { role: 'user', content: `User: ${message}\nAssistant: ${assistantMessage}` }
            ]
          })
        });
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          const summary = summaryData.choices[0].message.content;
          await base44.entities.Memory.create({ agent_id: agent_id, content: summary, conversation_id: conversation.id });
        }
      } catch (e) { /* memory generation failed, don't block */ }
    }

    return Response.json({ conversation_id: conversation.id, message: assistantMessage });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

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
    const { accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(GMAIL_CONNECTOR_ID);
    const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`;
    const searchRes = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (!searchRes.ok) return { error: 'Failed to search Gmail' };
    const searchData = await searchRes.json();

    const messages = await Promise.all((searchData.messages || []).slice(0, 3).map(async (msg) => {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!detailRes.ok) return null;
      const detail = await detailRes.json();
      const headers = detail.payload?.headers || [];
      return {
        subject: headers.find(h => h.name === 'Subject')?.value || '',
        from: headers.find(h => h.name === 'From')?.value || '',
        snippet: detail.snippet || ''
      };
    }));
    return messages.filter(m => m !== null);
  } catch (e) {
    return { error: 'Gmail not connected. Please connect Gmail in Settings.' };
  }
}

async function doGmailSend(base44, to, subject, body) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(GMAIL_CONNECTOR_ID);
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