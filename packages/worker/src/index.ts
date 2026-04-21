import { Worker, Job } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const renderQueue = new Worker(
  'render',
  async (job: Job) => {
    console.log(`🎬 Processing job ${job.id}`);

    const { compositionHtml, variables, outputFormat, quality } = job.data;

    // TODO: Call hyperframes CLI via execa
    // const result = await execa('npx', ['hyperframes', 'render', ...]);

    console.log(`✅ Job ${job.id} complete`);

    return { outputUrl: `https://storage.example.com/${job.id}.${outputFormat}` };
  },
  { connection }
);

renderQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

renderQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

console.log('🔄 Worker started, waiting for jobs...');

process.on('SIGTERM', async () => {
  await renderQueue.close();
  process.exit(0);
});