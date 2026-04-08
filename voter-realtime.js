/* Voter panel - Socket.io based realtime helper */
const VoterRealtime = {
  currentVoterId: null,
  hasVoted: false,

  init: async function () {
    console.log('🔄 Initializing Voter Realtime (socket)');
    this.deviceId = 'voter_' + Math.random().toString(36).slice(2, 11);
    await this.loadInitialData();
    this.setupListeners();
  },

  loadInitialData: async function () {
    try {
      const res = await fetch('/api/candidates', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load candidates');
      const candidates = await res.json();
      if (typeof renderVoterCandidates === 'function') renderVoterCandidates(candidates);
      return candidates;
    } catch (err) {
      console.error('Error loading initial data', err);
      return [];
    }
  },

  setupListeners: function () {
    // Listen for global vote updates dispatched by realtime-client
    window.addEventListener('voteUpdate', (ev) => {
      const data = ev.detail;
      if (typeof renderLiveResults === 'function') renderLiveResults(data);
      if (typeof renderVoterCandidates === 'function') renderVoterCandidates(data);
    });
  },

  submitVote: async function (candidateId) {
    try {
      // Use socket helper to submit vote
      if (!candidateId) return false;
      window.submitVote(candidateId);
      this.hasVoted = true;
      return true;
    } catch (err) {
      console.error('Error submitting vote', err);
      return false;
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => VoterRealtime.init());
} else {
  VoterRealtime.init();
}
