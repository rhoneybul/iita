// Seed events — lifted from the "things happening" sheet so first-run
// users see real content. Year is assumed 2026 (matches the source data
// timeline; tweak as needed).

const Y = 2026;

function d(month, day) {
  const m = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${Y}-${m}-${dd}`;
}

export const SEED_EVENTS = [
  // January
  { date: d(1, 25),  title: "Rob's ARC" },

  // February
  { date: d(2,  3),  title: 'Sailing Night' },
  { date: d(2,  4),  title: 'Dinner George & Claire?' },
  { date: d(2,  6),  title: 'Lee Miller exhibition' },
  { date: d(2,  7),  title: 'Rowing dinner' },
  { date: d(2,  8),  endDate: d(2, 15), title: 'Spain' },
  { date: d(2, 14),  title: 'San Valentin' },
  { date: d(2, 18),  title: 'Lo Moon' },
  { date: d(2, 20),  title: "Harry's band" },
  { date: d(2, 21),  title: 'Lost Atoms (Play)' },
  { date: d(2, 22),  title: 'Liam Kazar' },
  { date: d(2, 25),  title: 'Ellur!!' },
  { date: d(2, 26),  title: 'Portugal — Cassia' },

  // March
  { date: d(3,  4),  title: "Lucia's 28th" },
  { date: d(3,  6),  endDate: d(3, 8),  title: 'Gema in London' },
  { date: d(3,  7),  title: 'Lucia bday dinner' },
  { date: d(3, 11),  endDate: d(3, 15), title: 'Rob Sierra Nevada' },
  { date: d(3, 13),  endDate: d(3, 14), title: 'Lucia Manchester' },
  { date: d(3, 21),  title: 'Kingston Head — Lucia racing' },
  { date: d(3, 28),  title: 'Vets Head — Lucia racing' },

  // April
  { date: d(4,  4),  title: 'Boat Race' },
  { date: d(4, 10),  endDate: d(4, 13), title: 'Rob in France' },
  { date: d(4, 19),  endDate: d(4, 25), title: 'Lucia training camp' },
  { date: d(4, 23),  endDate: d(4, 27), title: 'Rob in France — surfing' },

  // May
  { date: d(5,  1),  title: "Rob's last day at Sylvera" },
  { date: d(5,  2),  title: 'Rob in Girona' },
  { date: d(5,  7),  endDate: d(5,  9), title: 'Louise and Katharine staying' },
  { date: d(5, 14),  title: 'Wimbledon Art Fair' },
  { date: d(5, 15),  title: 'Sancho Weekend' },
  { date: d(5, 20),  endDate: d(5, 31), title: 'Peterborough Regatta' },
  { date: d(5, 26),  title: 'Rob first day at Rezonant' },

  // June
  { date: d(6, 19),  endDate: d(6, 21), title: 'Henley Womens' },

  // July
  { date: d(7,  4),  endDate: d(7,  6), title: 'HRR' },
  { date: d(7,  4),  title: 'TWOD' },
  { date: d(7, 17),  endDate: d(7, 20), title: 'Brit Champs' },
  { date: d(7, 22),  endDate: d(8,  3), title: 'Spain (2wk) + Kayak' },

  // August
  { date: d(8,  8),  title: 'Nick Wedding — Canada' },
  { date: d(8, 15),  endDate: d(8, 16), title: 'Level 1 Dinghy' },
  { date: d(8, 29),  endDate: d(8, 30), title: 'Level 2 Dinghy' },

  // November
  { date: d(11, 6),  endDate: d(11, 8), title: 'George Wedding — Morocco' },

  // December
  { date: d(12, 9),  title: "Brenty's Wedding" },
  { date: d(12, 9),  title: 'Rob turns 33' },
];
