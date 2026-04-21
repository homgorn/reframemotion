import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'hyperframes-mcp',
    version: '0.1.0',
  },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'render_video',
        description: 'Render a video from HTML composition',
        inputSchema: {
          type: 'object',
          properties: {
            html: { type: 'string', description: 'HTML composition' },
            variables: { type: 'object', description: 'Variables for template' },
            format: { type: 'string', enum: ['mp4', 'webm'], default: 'mp4' },
          },
          required: ['html'],
        },
      },
      {
        name: 'list_templates',
        description: 'List available templates',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_job_status',
        description: 'Get render job status',
        inputSchema: {
          type: 'object',
          properties: {
            jobId: { type: 'string', description: 'Job ID' },
          },
          required: ['jobId'],
        },
      },
      {
        name: 'validate_composition',
        description: 'Validate HTML composition',
        inputSchema: {
          type: 'object',
          properties: {
            html: { type: 'string', description: 'HTML to validate' },
          },
          required: ['html'],
        },
      },
      {
        name: 'transcribe_audio',
        description: 'Transcribe audio to text',
        inputSchema: {
          type: 'object',
          properties: {
            audioUrl: { type: 'string', description: 'Audio file URL or path' },
          },
          required: ['audioUrl'],
        },
      },
      {
        name: 'text_to_speech',
        description: 'Generate speech from text',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to speak' },
            voice: { type: 'string', default: 'af_nova' },
          },
          required: ['text'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'render_video':
      return {
        content: [
          { type: 'text', text: `Job queued: ${crypto.randomUUID()}` },
        ],
      };
    case 'list_templates':
      return {
        content: [
          { type: 'text', text: 'Templates: blank, intro, outro, social' },
        ],
      };
    case 'get_job_status':
      return {
        content: [
          { type: 'text', text: `Job ${args.jobId}: processing` },
        ],
      };
    case 'validate_composition':
      return {
        content: [
          { type: 'text', text: 'Valid: true, warnings: []' },
        ],
      };
    case 'transcribe_audio':
      return {
        content: [
          { type: 'text', text: 'Transcription not implemented' },
        ],
      };
    case 'text_to_speech':
      return {
        content: [
          { type: 'text', text: 'TTS not implemented' },
        ],
      };
    default:
      return {
        content: [
          { type: 'text', text: `Unknown tool: ${name}` },
        ],
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🔌 MCP server running on stdio');
}

main();