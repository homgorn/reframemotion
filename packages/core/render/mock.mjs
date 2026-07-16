import fs from 'node:fs';

export async function renderMock({job, prepared, outputPath}) {
  const payload = {jobId: job.id, templateId: job.templateId, engine: 'mock', variables: prepared.variables, renderedAt: new Date().toISOString()};
  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  return {outputPath, metadata: {mock: true}};
}
