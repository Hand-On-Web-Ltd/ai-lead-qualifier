let sessionId = null;
const messages = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  addMessage('user', text);
  messageInput.value = '';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId }),
    });

    const data = await res.json();

    if (res.ok) {
      sessionId = data.sessionId;
      addMessage('bot', data.reply);

      if (data.qualification) {
        showQualification(data.qualification);
      }
    } else {
      addMessage('bot', 'Error: ' + data.error);
    }
  } catch (err) {
    addMessage('bot', 'Something went wrong: ' + err.message);
  }
}

function addMessage(role, text) {
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `<strong>${role === 'user' ? 'You' : 'Bot'}:</strong> ${escapeHtml(text)}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showQualification(q) {
  const card = document.getElementById('qualificationCard');
  document.getElementById('qualLabel').textContent = q.label;
  document.getElementById('qualScore').textContent = `Score: ${q.score}/100`;
  document.getElementById('qualSummary').textContent = q.summary || '';

  const breakdown = document.getElementById('qualBreakdown');
  breakdown.innerHTML = '';

  const labels = {
    budget: 'Budget',
    timeline: 'Timeline',
    companySize: 'Company Size',
    needClarity: 'Need Clarity',
  };

  for (const [key, data] of Object.entries(q.breakdown)) {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div class="label">${labels[key] || key}</div>
      <div class="value">${data.score}/100 (weight: ${data.weight}%)</div>
    `;
    breakdown.appendChild(item);
  }

  card.style.display = 'block';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
