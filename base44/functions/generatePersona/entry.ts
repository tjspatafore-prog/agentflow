import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_urls } = await req.json();
    if (!file_urls || file_urls.length === 0) return Response.json({ error: 'No files provided' }, { status: 400 });

    let combinedText = '';

    for (const fileUrl of file_urls) {
      const cleanUrl = fileUrl.split('?')[0];
      const ext = cleanUrl.split('.').pop().toLowerCase();
      const name = decodeURIComponent(cleanUrl.split('/').pop());

      try {
        if (['pdf', 'csv', 'xlsx', 'json', 'html', 'txt', 'md', 'doc', 'docx'].includes(ext)) {
          const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url: fileUrl,
            json_schema: { type: 'object', properties: { content: { type: 'string' } } }
          });
          if (result.status === 'success' && result.output) {
            const extracted = typeof result.output === 'string' ? result.output : JSON.stringify(result.output);
            combinedText += `\n\n--- ${name} ---\n${extracted.substring(0, 8000)}`;
          }
        } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `Describe the visual style, mood, and any text content visible in this image. Focus on tone and personality cues.`,
            file_urls: [fileUrl]
          });
          combinedText += `\n\n--- ${name} (image) ---\n${result}`;
        } else {
          combinedText += `\n\n--- ${name} ---\n[Binary file - content not extractable]`;
        }
      } catch (e) {
        combinedText += `\n\n--- ${name} ---\n[Extraction failed]`;
      }
    }

    if (!combinedText.trim()) {
      return Response.json({ error: 'Could not extract text from the provided files' }, { status: 400 });
    }

    const personaResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze the following documents and create a detailed "Writing Persona Profile" that captures the author's tone, writing style, vocabulary, sentence structure, formality level, humor, and unique mannerisms. Write it as direct instructions to an AI agent so it can replicate this exact voice in all responses. Do not reference the source documents - just describe the persona.\n\nDocuments:\n${combinedText.substring(0, 15000)}`,
      response_json_schema: {
        type: 'object',
        properties: {
          persona_profile: { type: 'string', description: 'A detailed writing persona profile written as instructions for an AI agent' }
        }
      }
    });

    const personaProfile = personaResult.persona_profile || '';

    return Response.json({ persona_profile: personaProfile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});