/* Admin panel - Socket.io based realtime helper */
const AdminRealtime = {
  init: async function () {
    console.log('🔄 Initializing Admin Realtime (socket)');
    await this.loadInitialData();
    this.setupListeners();
  },

  loadInitialData: async function () {
    try {
      const res = await fetch('/api/candidates', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load candidates');
      const candidates = await res.json();
      if (typeof renderCandidatesList === 'function') renderCandidatesList(candidates);
      if (typeof renderLiveResults === 'function') renderLiveResults(candidates);
      return candidates;
    } catch (err) {
      console.error('Error loading initial data', err);
      return [];
    }
  },

  setupListeners: function () {
    window.addEventListener('voteUpdate', (ev) => {
      const data = ev.detail;
      if (typeof renderLiveResults === 'function') renderLiveResults(data);
      if (typeof renderCandidatesList === 'function') renderCandidatesList(data);
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AdminRealtime.init());
} else {
  AdminRealtime.init();
}
