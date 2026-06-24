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
    const apiKey = settings.openai_api_key;
    if (!apiKey) return Response.json({ error: 'OpenAI API key not configured' }, { status: 400 });

    const conversation = await base44.entities.Conversation.create({
      title: goal.substring(0, 50),
      team_id: team_id,
      messages: [{ role: 'user', content: goal, timestamp: new Date().toISOString() }]
    });

    const trace = [];

    // Step 1: Decompose goal into sub-tasks
    const agentDescriptions = agents.map((a, i) => `Agent ${i + 1}: ${a.name} - ${a.role_description}`).join('\n');

    const decomposeRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a task orchestrator. Given a goal and a team of agents, decompose the goal into sub-tasks and assign each to the most appropriate agent. Return JSON with a "subtasks" array, each having "agent_name", "task", and "context" fields.' },
          { role: 'user', content: `Goal: ${goal}\n\nAvailable agents:\n${agentDescriptions}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const decomposeData = await decomposeRes.json();
    let subtasks;
    try {
      const parsed = JSON.parse(decomposeData.choices[0].message.content);
      subtasks = parsed.subtasks || parsed.tasks || [];
      if (!Array.isArray(subtasks)) subtasks = [subtasks];
    } catch (e) {
      subtasks = agents.map(a => ({ agent_name: a.name, task: goal, context: '' }));
    }

    trace.push({ step: 'Plan', description: `Decomposed goal into ${subtasks.length} sub-tasks`, subtasks: subtasks.map(s => ({ agent: s.agent_name, task: s.task })) });

    // Step 2: Execute each sub-task with the assigned agent
    const results = [];
    for (const subtask of subtasks) {
      const agent = agents.find(a => a.name === subtask.agent_name) || agents[0];

      trace.push({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'running' });

      const agentRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: agent.model || 'gpt-4o',
          messages: [
            { role: 'system', content: agent.system_prompt },
            { role: 'user', content: `Task: ${subtask.task}\n${subtask.context ? 'Context: ' + subtask.context : ''}\n\nOverall goal: ${goal}` }
          ]
        })
      });

      const agentData = await agentRes.json();
      const agentResult = agentData.choices[0].message.content;
      results.push({ agent: agent.name, task: subtask.task, result: agentResult });

      trace.push({ step: 'Execute', agent: agent.name, task: subtask.task, status: 'done', preview: agentResult.substring(0, 150) });
    }

    // Step 3: Synthesize results
    const synthesisInput = results.map(r => `Agent: ${r.agent}\nTask: ${r.task}\nResult: ${r.result}`).join('\n\n---\n\n');

    const synthRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a synthesis agent. Combine the results from multiple agents into a cohesive, well-structured final response that addresses the original goal. Use markdown formatting.' },
          { role: 'user', content: `Original goal: ${goal}\n\nAgent results:\n${synthesisInput}` }
        ]
      })
    });

    const synthData = await synthRes.json();
    const finalResponse = synthData.choices[0].message.content;

    await base44.entities.Conversation.update(conversation.id, {
      messages: [
        ...conversation.messages,
        { role: 'assistant', content: finalResponse, timestamp: new Date().toISOString() }
      ],
      summary: `Team goal: ${goal}`
    });

    trace.push({ step: 'Synthesize', description: 'Combined all agent results into final response' });

    return Response.json({ conversation_id: conversation.id, final_response: finalResponse, trace });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});