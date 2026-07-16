const metadataTokenUrl = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

export async function getGoogleAccessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  const response = await fetch(metadataTokenUrl, {headers: {'Metadata-Flavor': 'Google'}});
  if (!response.ok) throw new Error(`Google metadata token request failed: ${response.status}`);
  const body = await response.json();
  return body.access_token;
}

export async function runCloudRunJob({projectId, location, jobName, jobId, extraEnv = {}, token}) {
  for (const [name, value] of Object.entries({projectId, location, jobName, jobId})) if (!value) throw new TypeError(`${name} is required`);
  const accessToken = token ?? await getGoogleAccessToken();
  const endpoint = `https://run.googleapis.com/v2/projects/${encodeURIComponent(projectId)}/locations/${encodeURIComponent(location)}/jobs/${encodeURIComponent(jobName)}:run`;
  const env = [{name: 'REFRAMOTION_JOB_ID', value: jobId}, ...Object.entries(extraEnv).map(([name, value]) => ({name, value: String(value)}))];
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {authorization: `Bearer ${accessToken}`, 'content-type': 'application/json'},
    body: JSON.stringify({overrides: {taskCount: 1, containerOverrides: [{env}]}}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Cloud Run Jobs API failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}
