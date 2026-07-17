import fs from 'node:fs';
import path from 'node:path';

const INTERNAL_PROCESS_PATTERNS = [
  /\bHyperFrames\b/i,
  /\bRemotion\b/i,
  /\bCodex\b/i,
  /кодекс/i,
  /рендер/i,
  /таймлайн/i,
  /сториборд/i,
  /\bstoryboard\b/i,
  /\bSCRIPT\.md\b/i,
  /\bDESIGN\.md\b/i,
  /как\s+(?:сделан|создан|собран)/i,
  /ролик\s+(?:собран|создан|сделан|генерируется|делался)/i,
  /генерац/i,
  /композици/i,
];

const WEBSITE_META_PATTERNS = [
  /страниц[а-я]*/i,
  /сайт[а-я]*/i,
  /скриншот[а-я]*/i,
  /\bcapture\b/i,
  /\burl\b/i,
  /браузер[а-я]*/i,
  /ссылк[а-я]*/i,
];

const CTA_PATTERN = /(заявк|образц|рассчит|расчет|получить|подобрать|свяж|оставить|прайс|консультац|заказать)/i;
const VALUE_PATTERN = /(выгод|срок|быстр|монтаж|качество|безопасн|долговеч|эконом|проект|объект|решени|материал|панел)/i;

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveExistingPath(roots, filePath) {
  if (!filePath || /^https?:\/\//i.test(filePath)) return '';
  if (path.isAbsolute(filePath)) return fs.existsSync(filePath) ? filePath : '';
  for (const root of roots) {
    const candidate = path.resolve(root, filePath);
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

function readTextFile(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function excerptAt(text, index, length = 140) {
  const start = Math.max(0, index - 45);
  return text.slice(start, index + length).replace(/\s+/g, ' ').trim();
}

function addPatternIssues(issues, {text, file, source, patterns, severity, code, message}) {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (!match) continue;
    issues.push({
      severity,
      code,
      message,
      source,
      file,
      line: lineNumberForIndex(text, match.index),
      excerpt: excerptAt(text, match.index),
    });
  }
}

function countWords(text) {
  const matches = text.match(/[A-Za-zА-Яа-яЁё0-9]+(?:[-'][A-Za-zА-Яа-яЁё0-9]+)?/g);
  return matches ? matches.length : 0;
}

function uniqueTexts(sources) {
  const seen = new Set();
  const result = [];
  for (const source of sources) {
    const normalized = source.text.toLowerCase().replace(/\s+/g, ' ').trim();
    const key = normalized.slice(0, 2000);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(source.text);
  }
  return result;
}

function tempoSources(voiceSources) {
  const narration = voiceSources.filter((source) => /narration\.txt$/i.test(source.file));
  if (narration.length) return narration;
  const sidecar = voiceSources.filter((source) => /script-text\.txt$/i.test(source.file));
  if (sidecar.length) return sidecar;
  const script = voiceSources.filter((source) => /SCRIPT\.md$/i.test(source.file));
  if (script.length) return script;
  return voiceSources;
}

function textSourcesForProject(manifest, manifestPath, roots) {
  const sources = [];
  const addFile = (label, filePath) => {
    const resolved = resolveExistingPath(roots, filePath);
    if (resolved) sources.push({label, file: resolved, text: readTextFile(resolved)});
  };

  const sourcePath = manifest.sourcePath ? String(manifest.sourcePath) : '';
  if (sourcePath) {
    for (const file of ['SCRIPT.md', 'narration.txt', 'script-text.txt', 'captions.srt', 'captions.vtt']) {
      addFile(file, path.join(sourcePath, file));
      addFile(file, path.join(sourcePath, 'exports', file));
    }
  }

  for (const artifact of asArray(manifest.artifacts)) {
    if (!['script', 'storyboard', 'subtitle', 'text', 'transcript'].includes(String(artifact.type ?? ''))) continue;
    addFile(String(artifact.label ?? artifact.type), String(artifact.path ?? ''));
  }

  const seen = new Set();
  return sources.filter((source) => {
    const key = source.file.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return source.text.trim().length > 0 && path.resolve(source.file) !== path.resolve(manifestPath);
  });
}

export function validateProjectContent({manifest, manifestPath = '', roots = [process.cwd()], mode = 'client-presentation'} = {}) {
  const issues = [];
  const sources = textSourcesForProject(manifest, manifestPath, roots);
  const voiceSources = sources.filter((source) => /script|narration|caption|subtitle|srt|vtt/i.test(`${source.label} ${source.file}`));
  const reviewSources = voiceSources.length ? voiceSources : sources;

  for (const source of reviewSources) {
    addPatternIssues(issues, {
      text: source.text,
      file: source.file,
      source: source.label,
      patterns: INTERNAL_PROCESS_PATTERNS,
      severity: 'error',
      code: 'internal_process_in_client_voice',
      message: 'Client-facing narration must not mention generation, render pipeline, HyperFrames, Codex or production internals.',
    });
    if (mode === 'client-presentation') {
      addPatternIssues(issues, {
        text: source.text,
        file: source.file,
        source: source.label,
        patterns: WEBSITE_META_PATTERNS,
        severity: 'error',
        code: 'website_meta_in_client_voice',
        message: 'Client-facing narration should sell the offer, not describe the website, pages, screenshots, URLs or browser capture.',
      });
    }
  }

  const combinedVoiceText = uniqueTexts(tempoSources(voiceSources)).join('\n\n');
  if (String(manifest.audioMode ?? '').includes('voice')) {
    if (!voiceSources.length) {
      issues.push({severity: 'error', code: 'missing_voice_text', message: 'Voice project has no script, transcript, narration or captions text to review.'});
    }
    if (manifest.sourcePath && !resolveExistingPath(roots, path.join(String(manifest.sourcePath), 'PRONUNCIATION.md'))) {
      issues.push({severity: 'warning', code: 'missing_pronunciation_guide', message: 'Voice project should include PRONUNCIATION.md for brand names, abbreviations and Russian TTS fixes.'});
    }
  }

  if (combinedVoiceText.trim()) {
    if (!CTA_PATTERN.test(combinedVoiceText)) {
      issues.push({severity: 'warning', code: 'missing_cta', message: 'Narration does not contain a clear client action: request samples, calculation, price list, consultation or contact.'});
    }
    if (!VALUE_PATTERN.test(combinedVoiceText)) {
      issues.push({severity: 'warning', code: 'weak_value_proposition', message: 'Narration does not contain enough product, project, benefit or buyer-value language.'});
    }
    const durationSec = Number(manifest.durationSec);
    if (Number.isFinite(durationSec) && durationSec > 0 && String(manifest.audioMode ?? '') !== 'silent') {
      const wordsPerMinute = Math.round(countWords(combinedVoiceText) / (durationSec / 60));
      if (wordsPerMinute > 180) {
        issues.push({severity: 'error', code: 'voice_too_fast', message: `Estimated voice speed is ${wordsPerMinute} wpm; keep Russian presentation voice under 180 wpm.`});
      } else if (wordsPerMinute > 155) {
        issues.push({severity: 'warning', code: 'voice_fast', message: `Estimated voice speed is ${wordsPerMinute} wpm; consider a calmer 120-150 wpm delivery.`});
      }
    }
  }

  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.filter((issue) => issue.severity === 'warning').length;
  return {
    status: errors ? 'failed' : warnings ? 'warning' : 'passed',
    errors,
    warnings,
    reviewedSources: reviewSources.map((source) => path.relative(process.cwd(), source.file).replaceAll('\\', '/')),
    issues,
  };
}
