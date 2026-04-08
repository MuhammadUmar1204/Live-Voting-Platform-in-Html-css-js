// Simple client-side Socket.io helper
const socket = io();

socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('disconnect', () => console.log('Socket disconnected'));

socket.on('voteUpdate', (data) => {
  try {
    // Dispatch an event so pages can update UI
    window.dispatchEvent(new CustomEvent('voteUpdate', { detail: data }));
  } catch (e) {
    console.error('Error handling voteUpdate', e);
  }
});

window.submitVote = function (candidateId) {
  if (!candidateId) return;
  socket.emit('submitVote', candidateId);
};
