-- =====================================================================
-- Outly — DEMO seed (fictional venues, fictional deals).
-- DEMO / DEV ENVIRONMENTS ONLY. Never run against production (D5).
-- Venue names are invented and deliberately do not match real Sydney venues.
-- Users are created by scripts/seed-demo-users.ts through the Auth admin API
-- (auth.users cannot be seeded portably); this file seeds venues and content.
-- =====================================================================

insert into venues (id, partner_status, name, address, lat, lng, categories, vibe_tags, description,
                    commission_rate, default_guest_list_capacity, is_demo) values
 ('00000000-0000-4000-a000-000000000001','partner','Harbourlight Rooftop','1 Demo Lane, The Rocks NSW 2000',-33.8592,151.2081,
  '{bar,rooftop}','{views,cocktails,live_music}','Multi-level rooftop bar with harbour views, cocktails and weekend DJs.',0.03,120,true),
 ('00000000-0000-4000-a000-000000000002','partner','Velvet Tram','22 Sample St, Surry Hills NSW 2010',-33.8858,151.2110,
  '{bar,cocktail_bar}','{date_night,late_night}','Intimate cocktail bar in an old tram depot. Seasonal menu, low lights.',0.03,60,true),
 ('00000000-0000-4000-a000-000000000003','partner','Casa Nonna Demo','8 Example Rd, Rozelle NSW 2039',-33.8610,151.1710,
  '{restaurant,italian}','{group_friendly,brunch}','Loud, generous Italian with long tables for groups.',0.03,40,true),
 ('00000000-0000-4000-a000-000000000004','pending','The Brass Anchor','5 Test Wharf, Barangaroo NSW 2000',-33.8615,151.2010,
  '{pub,rooftop}','{sports,after_work}','Waterfront pub with a rooftop terrace and big screens.',0.03,100,true),
 ('00000000-0000-4000-a000-000000000005','listed','Neon Palms Club','40 Mock Ave, Potts Point NSW 2011',-33.8720,151.2250,
  '{club,live_music}','{late_night,dance}','Late-night club with house and RnB nights.',0.03,200,true);

insert into deals (venue_id, title, description, categories, source, status, starts_at, ends_at, recurrence, is_demo) values
 ('00000000-0000-4000-a000-000000000001','20% off signature cocktails','Mon–Thu, 4–7pm.','{drinks}','demo','active', now() - interval '1 day', now() + interval '30 days','FREQ=WEEKLY;BYDAY=MO,TU,WE,TH',true),
 ('00000000-0000-4000-a000-000000000001','2 for 1 spritz','Daily 4–7pm.','{drinks}','demo','active', now() - interval '1 day', now() + interval '14 days','FREQ=DAILY',true),
 ('00000000-0000-4000-a000-000000000003','$15 pasta & a glass','Mon–Wed dinner.','{food,drinks}','demo','active', now() - interval '1 day', now() + interval '21 days','FREQ=WEEKLY;BYDAY=MO,TU,WE',true),
 ('00000000-0000-4000-a000-000000000001','Free entry before 10pm','Saturdays, guest list only.','{entry}','demo','active', now() - interval '1 day', now() + interval '60 days','FREQ=WEEKLY;BYDAY=SA',true);

insert into events (venue_id, title, description, tags, starts_at, ends_at, price_cents, source, status, is_demo) values
 ('00000000-0000-4000-a000-000000000001','Sunset Sessions','Live acoustic set on the rooftop.','{live_music}',
   date_trunc('day', now()) + interval '2 days 16 hours', date_trunc('day', now()) + interval '2 days 20 hours', null,'demo','active',true),
 ('00000000-0000-4000-a000-000000000005','House & RnB Night','Resident DJs till late.','{dj,club}',
   date_trunc('day', now()) + interval '5 days 21 hours', date_trunc('day', now()) + interval '6 days 3 hours', 2000,'demo','active',true),
 ('00000000-0000-4000-a000-000000000002','Trivia Tuesday','Teams up to 6, prizes.','{trivia}',
   date_trunc('day', now()) + interval '3 days 19 hours', date_trunc('day', now()) + interval '3 days 22 hours', null,'demo','active',true);

insert into guest_lists (venue_id, night, capacity, closes_at) values
 ('00000000-0000-4000-a000-000000000001', (now() at time zone 'Australia/Sydney')::date, 120,
   (((now() at time zone 'Australia/Sydney')::date + time '22:00') at time zone 'Australia/Sydney')),
 ('00000000-0000-4000-a000-000000000002', (now() at time zone 'Australia/Sydney')::date, 60, null);

-- Demo launch night: mirrors the Rouge flow (SPEC A4) with fictional data.
-- Velvet Tram has no other drinks deal, so the Outly drinks offer below starts OFF (draft), as for Rouge.
-- Event + linked guest list (200, no closing time) + line-up + a drinks offer left OFF (draft).
insert into events (id, venue_id, title, description, tags, starts_at, ends_at, source, status, is_demo) values
 ('00000000-0000-4000-b000-000000000001','00000000-0000-4000-a000-000000000002','Outly Launch Night',
  'Skip the queue with Outly: join the list and use the fast lane.','{launch,dj}',
  ((now() at time zone 'Australia/Sydney')::date + time '21:00') at time zone 'Australia/Sydney',
  ((now() at time zone 'Australia/Sydney')::date + 1 + time '03:00') at time zone 'Australia/Sydney',
  'demo','active',true);

insert into guest_lists (id, venue_id, event_id, night, capacity, closes_at, note) values
 ('00000000-0000-4000-c000-000000000001','00000000-0000-4000-a000-000000000002','00000000-0000-4000-b000-000000000001',
  (now() at time zone 'Australia/Sydney')::date, 200, null, 'Fast lane for Outly members');

insert into event_sets (event_id, artist_name, starts_at, ends_at, sort) values
 ('00000000-0000-4000-b000-000000000001','DJ Demo One',
  ((now() at time zone 'Australia/Sydney')::date + time '21:00') at time zone 'Australia/Sydney',
  ((now() at time zone 'Australia/Sydney')::date + time '23:00') at time zone 'Australia/Sydney', 1),
 ('00000000-0000-4000-b000-000000000001','Sample Collective',
  ((now() at time zone 'Australia/Sydney')::date + time '23:00') at time zone 'Australia/Sydney',
  ((now() at time zone 'Australia/Sydney')::date + 1 + time '01:00') at time zone 'Australia/Sydney', 2),
 ('00000000-0000-4000-b000-000000000001','Placeholder B2B Test',
  ((now() at time zone 'Australia/Sydney')::date + 1 + time '01:00') at time zone 'Australia/Sydney',
  ((now() at time zone 'Australia/Sydney')::date + 1 + time '03:00') at time zone 'Australia/Sydney', 3);

insert into deals (id, venue_id, title, description, categories, source, status, is_demo) values
 ('00000000-0000-4000-d000-000000000001','00000000-0000-4000-a000-000000000002','10% off cocktails for Outly members',
  'Show your Outly pass at the bar. Please drink responsibly.','{drinks}','demo','draft',true);
