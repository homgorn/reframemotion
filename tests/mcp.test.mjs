import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatchMcp} from '../apps/mcp/server.mjs';

test('MCP initialize and tools/list expose Codex-compatible capabilities', async () => {
  const init = await dispatchMcp({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18'}});
  assert.equal(init.result.serverInfo.name, 'reframotion-mcp');
  const list = await dispatchMcp({jsonrpc:'2.0',id:2,method:'tools/list'});
  assert.ok(list.result.tools.some((tool) => tool.name === 'create_render_batch'));
});
