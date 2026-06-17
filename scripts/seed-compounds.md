# Seeding the compound CMS

The `public.compounds` table starts **empty**, so the dashboard's Compounds page shows
a "using bundled fallback" notice. The app keeps using its bundled
`src/data/compounds.js` (33 compounds) until you seed the table and wire the app-side
fetch (a V3 app change — see DECISIONS.md).

## One-time seed (so the CMS has rows to edit)

```bash
cd /Users/jettarch/Projects/bluprint-admin
node scripts/seed-compounds.mjs > /tmp/seed-compounds.sql
```

Then run `/tmp/seed-compounds.sql` against the database:
- **Supabase SQL editor:** paste the file contents and Run, OR
- **psql:** `psql "$DATABASE_URL" -f /tmp/seed-compounds.sql`

It generates an idempotent `insert … on conflict (id) do update …` of all 33 bundled
compounds (scalar fields → columns, the full object → the `data` jsonb).

## Notes
- **Re-running resets to the bundled baseline.** After you edit compounds in the
  dashboard, re-running this script overwrites those edits. Only re-run to reset.
- The dashboard edits the columned fields (name, category, research badge, one-liner,
  legal status, what-it-is, how-it-works, benefits/side-effects/categories/aka) and the
  visible/hidden flag; everything else is preserved in `data`.
- **The app does not fetch these yet.** Wiring the app to fetch + cache compounds from
  this table (with the bundled array as offline fallback) is the remaining V3 app
  change. Until then this table only powers the dashboard CMS view/edit; edits won't
  reach users without that app change + a release.
