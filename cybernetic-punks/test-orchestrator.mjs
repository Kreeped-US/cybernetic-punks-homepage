const response = await fetch('http://localhost:3000/api/orchestrate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer neon-grid-secret-2025',
  },
  body: JSON.stringify({
    taskType: 'GHOST_COMMUNITY_PULSE',
    payload: {
      editor: 'GHOST',
      topic: 'Community reaction to Server Slam matchmaking issues and queue times',
      sentiment: 'frustrated but engaged',
      source: 'Discord/Reddit',
    },
  }),
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));