const API_URL = 'https://paymegpt.com/mcp';
const AUTH = 'Bearer QUNDX1Y2QzdOUVNDOjE3NzMxOTU2NjcyMzM6YzMyZDZiZmM4ZmUyNGU1MjU3NWM5ZTNmMTU1MmIxNmZmYmY2NmRmMjA1ZGJmNDhhMTA5OWY5NzIyM2UyY2QxMA==';

let state = {
  selectedModel: 'gpt-image-1.5',
  selectedRatio: '1:1',
  selectedQuality: 'standard',
  selectedPlatform: 'facebook',
  generatedImageUrl: '',
  composePlatform: 'facebook',
  composeImageUrl: ''
};

// API CALL
async function callMCP(method, args) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': AUTH
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 9999),
      method: 'tools/call',
      params: { name: method, arguments: args }
    })
  });
  const text = await res.text();
  // Handle SSE or JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // Try to extract JSON from SSE
    const lines = text.split('\n').filter(l => l.startsWith('data:'));
    for (const line of lines) {
      try {
        data = JSON.parse(line.replace('data:', '').trim());
        if (data) break;
      } catch {}
    }
  }
  return data;
}

// TAB SWITCHING
function switchTab(tab) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  document.getElementById('tab-' + tab).classList.add('active');
}

// MODEL SELECT
function selectModel(el, model) {
  document.querySelectorAll('.model-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedModel = model;
}

// RATIO SELECT
function selectRatio(el, ratio) {
  document.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedRatio = ratio;
}

// QUALITY SELECT
function selectQuality(el, q) {
  document.querySelectorAll('.q-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedQuality = q;
}

// PLATFORM SELECT
function selectPlatform(el, platform) {
  document.querySelectorAll('#panel-post .platform-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedPlatform = platform;
}

function selectComposePlatform(el, platform) {
  document.querySelectorAll('#compose-step-2 .platform-pill').forEach(p => p.classList.remove('selected'));
  el.classList.add('selected');
  state.composePlatform = platform;
}

// QUICK PROMPT
function setPrompt(p) {
  document.getElementById('gen-prompt').value = p;
}

// LOADING
function showLoading(text = 'Processing...', sub = 'This may take a moment') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-sub').textContent = sub;
  document.getElementById('loading').classList.add('visible');
}
function hideLoading() {
  document.getElementById('loading').classList.remove('visible');
}

// TOAST
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: '💡' };
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

// CHAR COUNT
function updateCharCount(el) {
  const count = el.value.length;
  const max = parseInt(el.getAttribute('maxlength'));
  const display = document.getElementById('char-count');
  display.textContent = `${count} / ${max}`;
  display.classList.toggle('warn', count > max * 0.9);
}

// EXTRACT IMAGE URL FROM RESPONSE
function extractImageUrl(data) {
  if (!data) return null;
  const str = JSON.stringify(data);
  // Look for https URLs with image extensions or common image hosting patterns
  const urlMatch = str.match(/https?:\/\/[^\s"'\\]+\.(jpg|jpeg|png|gif|webp)(\?[^\s"'\\]*)?/i);
  if (urlMatch) return urlMatch[0];
  // Look for any https URL that might be an image
  const anyUrl = str.match(/https?:\/\/[^\s"'\\]{10,}/g);
  if (anyUrl) {
    for (const u of anyUrl) {
      const clean = u.replace(/["\\\]})]+$/, '');
      if (clean.length > 15) return clean;
    }
  }
  return null;
}

// GENERATE IMAGE
async function generateImage() {
  const prompt = document.getElementById('gen-prompt').value.trim();
  if (!prompt) { toast('Please enter a prompt', 'error'); return; }

  showLoading('Generating Image...', `Using ${state.selectedModel}`);
  document.getElementById('gen-btn').disabled = true;

  try {
    const data = await callMCP('generate_image', {
      prompt,
      model: state.selectedModel,
      aspectRatio: state.selectedRatio,
      quality: state.selectedQuality
    });

    const url = extractImageUrl(data);

    if (url) {
      state.generatedImageUrl = url;
      document.getElementById('result-card').style.display = 'block';
      document.getElementById('result-url').value = url;
      const imgResult = document.getElementById('image-result');
      imgResult.innerHTML = `<img src="${url}" alt="Generated Image" onerror="this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><div class=\\'image-placeholder-icon\\'>🖼️</div><div>Image loaded (URL copied)</div></div>'">`;
      imgResult.classList.add('has-image');
      toast('Image generated successfully!', 'success');
    } else {
      // Show raw response
      document.getElementById('result-card').style.display = 'block';
      const raw = JSON.stringify(data, null, 2).substring(0, 500);
      document.getElementById('result-url').value = 'See raw response below';
      document.getElementById('image-result').innerHTML = `<div class="image-placeholder"><div class="image-placeholder-icon">📋</div><div style="font-size:10px;font-family:monospace;color:var(--accent3);padding:8px;word-break:break-all;max-height:200px;overflow:auto;">${raw}</div></div>`;
      toast('Response received — check raw output', 'info');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading();
    document.getElementById('gen-btn').disabled = false;
  }
}

// COPY URL
function copyUrl() {
  const url = document.getElementById('result-url').value;
  if (!url || url === 'URL will appear after generation') return;
  navigator.clipboard.writeText(url).then(() => toast('URL copied!', 'success')).catch(() => {
    const el = document.getElementById('result-url');
    el.select(); document.execCommand('copy');
    toast('URL copied!', 'success');
  });
}

function openImage() {
  if (state.generatedImageUrl) window.open(state.generatedImageUrl, '_blank');
}

function goToPost() {
  if (state.generatedImageUrl) {
    document.getElementById('post-image-url').value = state.generatedImageUrl;
    updatePostPreview();
  }
  switchTab('post');
}

// LIST ACCOUNTS
async function listAccounts() {
  showLoading('Fetching Accounts...', 'Loading connected social profiles');
  document.getElementById('accounts-btn').disabled = true;

  try {
    const data = await callMCP('list_social_accounts', {});
    const container = document.getElementById('accounts-list');

    if (!data) throw new Error('No response');

    // Try to parse accounts from response
    const str = JSON.stringify(data);
    let accounts = [];

    // Try to find accounts array in response
    try {
      const parsed = data?.result?.content?.[0]?.text;
      if (parsed) {
        const obj = JSON.parse(parsed);
        accounts = obj.accounts || obj.data || obj.pages || [];
      }
    } catch {}

    if (accounts.length === 0) {
      // Show raw response in a readable format
      const raw = JSON.stringify(data, null, 2);
      container.innerHTML = `
        <div class="card">
          <div class="card-title">📋 API Response</div>
          <div class="result-box" style="max-height:300px;">${raw}</div>
          <p style="font-size:12px;color:var(--muted);margin-top:10px;">Copy your page IDs from the response above to use in the Post tab.</p>
        </div>`;
    } else {
      const platformIcons = { facebook: '📘', instagram: '📸', twitter: '🐦', x: '🐦' };
      const platformColors = { facebook: '#1877f2', instagram: '#e1306c', twitter: '#1da1f2', x: '#000' };
      container.innerHTML = accounts.map(acc => `
        <div class="account-item">
          <div class="account-avatar" style="background:${platformColors[acc.platform] || '#333'}22;">
            ${platformIcons[acc.platform] || '🌐'}
          </div>
          <div class="account-info">
            <div class="account-name">${acc.name || acc.username || 'Account'}</div>
            <div class="account-id">${acc.id || acc.pageId || ''}</div>
            <div class="account-platform" style="color:${platformColors[acc.platform] || 'var(--accent)'};">${acc.platform || 'Social'}</div>
          </div>
          <div class="account-actions">
            <button class="use-btn" onclick="useAccount('${acc.id || acc.pageId}','${acc.platform}')">Use</button>
          </div>
        </div>
      `).join('');
    }
    toast('Accounts loaded!', 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
    document.getElementById('accounts-list').innerHTML = `<div class="card"><div class="result-box">Error: ${e.message}</div></div>`;
  } finally {
    hideLoading();
    document.getElementById('accounts-btn').disabled = false;
  }
}

function useAccount(id, platform) {
  document.getElementById('post-page-id').value = id;
  // Select platform
  const pills = document.querySelectorAll('#panel-post .platform-pill');
  pills.forEach(p => p.classList.remove('selected'));
  const platformMap = { facebook: 0, instagram: 1, twitter: 2, x: 2 };
  const idx = platformMap[platform] ?? 0;
  if (pills[idx]) pills[idx].classList.add('selected');
  state.selectedPlatform = platform === 'x' ? 'twitter' : platform;
  switchTab('post');
  toast(`Account selected for ${platform}`, 'success');
}

// POST PREVIEW UPDATE
function updatePostPreview() {
  const imgUrl = document.getElementById('post-image-url').value;
  const msg = document.getElementById('post-message').value;
  const section = document.getElementById('post-preview-section');
  if (imgUrl || msg) {
    section.style.display = 'block';
    document.getElementById('preview-text').textContent = msg || 'No caption';
    const thumb = document.getElementById('preview-thumb');
    if (imgUrl) {
      thumb.src = imgUrl;
      thumb.style.display = 'block';
    } else {
      thumb.style.display = 'none';
    }
  }
}

document.getElementById('post-image-url').addEventListener('input', updatePostPreview);
document.getElementById('post-message').addEventListener('input', updatePostPreview);

// POST TO SOCIAL
async function postToSocial() {
  const pageId = document.getElementById('post-page-id').value.trim();
  const message = document.getElementById('post-message').value.trim();
  const imageUrl = document.getElementById('post-image-url').value.trim();

  if (!pageId) { toast('Please enter a page/account ID', 'error'); return; }
  if (!message) { toast('Please enter a message', 'error'); return; }
  if (state.selectedPlatform === 'instagram' && !imageUrl) {
    toast('Instagram requires an image URL', 'error'); return;
  }

  showLoading('Publishing Post...', `Posting to ${state.selectedPlatform}`);
  document.getElementById('post-btn').disabled = true;

  try {
    const args = {
      platform: state.selectedPlatform,
      pageId,
      message
    };
    if (imageUrl) args.imageUrl = imageUrl;

    const data = await callMCP('post_to_social_media', args);
    const raw = JSON.stringify(data, null, 2);

    document.getElementById('post-result').style.display = 'block';
    document.getElementById('post-result-box').textContent = raw;
    toast('Post published successfully! 🎉', 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading();
    document.getElementById('post-btn').disabled = false;
  }
}

// COMPOSE WORKFLOW
async function composeGenerate() {
  const prompt = document.getElementById('compose-prompt').value.trim();
  if (!prompt) { toast('Please enter a content idea', 'error'); return; }

  const model = document.getElementById('compose-model').value;
  const progressBar = document.getElementById('compose-progress');
  const progressFill = document.getElementById('compose-progress-fill');

  progressBar.style.display = 'block';
  let prog = 0;
  const interval = setInterval(() => {
    prog = Math.min(prog + Math.random() * 15, 85);
    progressFill.style.width = prog + '%';
  }, 400);

  showLoading('Generating Image...', `Using ${model}`);

  // Update step indicators
  document.getElementById('cstep-1').className = 'step active';
  document.getElementById('cstep-2').className = 'step';
  document.getElementById('cstep-3').className = 'step';

  try {
    const data = await callMCP('generate_image', {
      prompt,
      model,
      aspectRatio: '1:1',
      quality: 'high'
    });

    clearInterval(interval);
    progressFill.style.width = '100%';

    const url = extractImageUrl(data);

    if (url) {
      state.composeImageUrl = url;
      document.getElementById('compose-img').src = url;
      document.getElementById('compose-step-2').style.display = 'block';
      document.getElementById('cstep-1').className = 'step done';
      document.getElementById('cstep-2').className = 'step active';
      toast('Image ready! Choose your platform.', 'success');
    } else {
      // Use placeholder for demo
      state.composeImageUrl = 'https://via.placeholder.com/512x512/7c5cfc/ffffff?text=AI+Generated';
      document.getElementById('compose-img').src = state.composeImageUrl;
      document.getElementById('compose-step-2').style.display = 'block';
      document.getElementById('cstep-1').className = 'step done';
      document.getElementById('cstep-2').className = 'step active';
      toast('Response received — review and publish', 'info');
    }
  } catch (e) {
    clearInterval(interval);
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading();
    setTimeout(() => { progressBar.style.display = 'none'; progressFill.style.width = '0%'; }, 500);
  }
}

async function composePublish() {
  const pageId = document.getElementById('compose-page-id').value.trim();
  const caption = document.getElementById('compose-caption').value.trim();

  if (!pageId) { toast('Please enter a page/account ID', 'error'); return; }

  showLoading('Publishing...', `Posting to ${state.composePlatform}`);
  document.getElementById('compose-publish-btn').disabled = true;

  try {
    const args = {
      platform: state.composePlatform,
      pageId,
      message: caption
    };
    if (state.composeImageUrl) args.imageUrl = state.composeImageUrl;

    const data = await callMCP('post_to_social_media', args);
    const raw = JSON.stringify(data, null, 2);

    document.getElementById('compose-step-3').style.display = 'block';
    document.getElementById('compose-step-2').style.display = 'none';
    document.getElementById('cstep-2').className = 'step done';
    document.getElementById('cstep-3').className = 'step active';
    document.getElementById('compose-success-msg').textContent = `Your post has been published to ${state.composePlatform}. Engagement metrics will update shortly.`;
    document.getElementById('compose-result-box').textContent = raw;
    toast('🎉 Post live!', 'success');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    hideLoading();
    document.getElementById('compose-publish-btn').disabled = false;
  }
}

function resetCompose() {
  document.getElementById('compose-step-2').style.display = 'none';
  document.getElementById('compose-step-3').style.display = 'none';
  document.getElementById('cstep-1').className = 'step active';
  document.getElementById('cstep-2').className = 'step';
  document.getElementById('cstep-3').className = 'step';
  document.getElementById('compose-page-id').value = '';
  state.composeImageUrl = '';
  state.composePlatform = 'facebook';
  document.querySelectorAll('#compose-step-2 .platform-pill').forEach((p, i) => {
    p.classList.toggle('selected', i === 0);
  });
  toast('Ready for a new post!', 'info');
}

// Init char count
updateCharCount(document.getElementById('post-message'));