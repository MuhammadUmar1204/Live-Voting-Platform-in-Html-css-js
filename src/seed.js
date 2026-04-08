const db = require('./db');

async function seed() {
  try {
    await db.init();
    const samples = [
      { name: 'Aisha Khan', party: 'Unity Party', imageURL: 'https://i.pravatar.cc/400?img=47' },
      { name: 'Bilal Ahmed', party: 'Progressive Front', imageURL: 'https://i.pravatar.cc/400?img=12' },
      { name: 'Chen Li', party: 'Green Alliance', imageURL: 'https://i.pravatar.cc/400?img=33' }
    ];

    for (const c of samples) {
      // try to add, ignore errors for duplicates
      try {
        await db.addCandidate(c);
        console.log('Inserted candidate:', c.name);
      } catch (e) {
        console.warn('Could not insert candidate:', c.name, e.message);
      }
    }

    console.log('Seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed', err);
    process.exit(1);
  }
}

seed();
