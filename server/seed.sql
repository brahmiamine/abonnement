-- Catalogue de départ (catégories et modèles de fournisseurs), repris de l'ancienne base Supabase.
-- Rejouable : met à jour les lignes existantes. À appliquer après le schéma :
--   mariadb abonnement < server/seed.sql

SET NAMES utf8mb4;

INSERT INTO subscription_categories (id, label, sort_order) VALUES
  ('Streaming', 'Streaming', 10),
  ('Musique', 'Musique', 20),
  ('IA', 'IA', 30),
  ('Cloud', 'Cloud', 40),
  ('Productivité', 'Productivité', 50),
  ('Gaming', 'Gaming', 60),
  ('Sport', 'Sport', 70),
  ('Télécom', 'Télécom', 80),
  ('Assurance', 'Assurance', 90),
  ('Énergie', 'Énergie', 100),
  ('Transport', 'Transport', 110),
  ('Fitness', 'Fitness', 120),
  ('Autre', 'Autre', 999)
ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order);

INSERT INTO subscription_provider_templates (id, name, category, logo, website, color, sort_order) VALUES
  ('netflix', 'Netflix', 'Streaming', 'https://cdn.simpleicons.org/netflix', 'https://netflix.com', '#E50914', 10),
  ('disney', 'Disney+', 'Streaming', 'https://cdn.simpleicons.org/disneyplus', 'https://disneyplus.com', '#113CCF', 20),
  ('prime', 'Prime Video', 'Streaming', 'https://cdn.simpleicons.org/primevideo', 'https://primevideo.com', '#00A8E1', 30),
  ('canal', 'CANAL+', 'Streaming', 'https://cdn.simpleicons.org/canalplus', 'https://canalplus.com', '#111111', 40),
  ('crunchyroll', 'Crunchyroll', 'Streaming', 'https://cdn.simpleicons.org/crunchyroll', 'https://crunchyroll.com', '#F47521', 50),
  ('spotify', 'Spotify', 'Musique', 'https://cdn.simpleicons.org/spotify', 'https://spotify.com', '#1ED760', 60),
  ('youtube', 'YouTube Premium', 'Streaming', 'https://cdn.simpleicons.org/youtube', 'https://youtube.com/premium', '#FF0000', 70),
  ('deezer', 'Deezer', 'Musique', 'https://cdn.simpleicons.org/deezer', 'https://deezer.com', '#A238FF', 80),
  ('applemusic', 'Apple Music', 'Musique', 'https://cdn.simpleicons.org/applemusic', 'https://music.apple.com', '#FA243C', 90),
  ('chatgpt', 'ChatGPT', 'IA', 'https://cdn.simpleicons.org/openai', 'https://chatgpt.com', '#10A37F', 100),
  ('kimi-ai', 'Kimi AI', 'IA', 'https://www.google.com/s2/favicons?domain=kimi.com&sz=128', 'https://www.kimi.com', '#171717', 100),
  ('ovh-vps', 'OVH VPS', 'Cloud', 'https://www.google.com/s2/favicons?domain=ovhcloud.com&sz=128', 'https://www.ovhcloud.com/fr/vps/', '#0050D7', 101),
  ('ovh-domaine', 'OVH Domaine', 'Cloud', 'https://www.google.com/s2/favicons?domain=ovhcloud.com&sz=128', 'https://www.ovhcloud.com/fr/domains/', '#0050D7', 102),
  ('claude', 'Claude', 'IA', 'https://cdn.simpleicons.org/anthropic', 'https://claude.ai', '#D97757', 110),
  ('gemini', 'Google Gemini', 'IA', 'https://cdn.simpleicons.org/googlegemini', 'https://gemini.google.com', '#4E82EE', 120),
  ('midjourney', 'Midjourney', 'IA', 'https://www.google.com/s2/favicons?domain=midjourney.com&sz=128', 'https://midjourney.com', '#111827', 130),
  ('github', 'GitHub', 'Productivité', 'https://cdn.simpleicons.org/github', 'https://github.com', '#24292F', 140),
  ('notion', 'Notion', 'Productivité', 'https://cdn.simpleicons.org/notion', 'https://notion.so', '#111111', 150),
  ('figma', 'Figma', 'Productivité', 'https://cdn.simpleicons.org/figma', 'https://figma.com', '#F24E1E', 160),
  ('canva', 'Canva', 'Productivité', 'https://cdn.simpleicons.org/canva', 'https://canva.com', '#00C4CC', 170),
  ('microsoft365', 'Microsoft 365', 'Productivité', 'https://cdn.simpleicons.org/microsoft365', 'https://microsoft.com/microsoft-365', '#D83B01', 180),
  ('adobe', 'Adobe Creative Cloud', 'Productivité', 'https://cdn.simpleicons.org/adobecreativecloud', 'https://adobe.com/creativecloud.html', '#DA1F26', 190),
  ('googleone', 'Google One', 'Cloud', 'https://cdn.simpleicons.org/googleone', 'https://one.google.com', '#4285F4', 200),
  ('icloud', 'iCloud+', 'Cloud', 'https://cdn.simpleicons.org/icloud', 'https://icloud.com', '#3693F3', 210),
  ('dropbox', 'Dropbox', 'Cloud', 'https://cdn.simpleicons.org/dropbox', 'https://dropbox.com', '#0061FF', 220),
  ('xbox', 'Xbox Game Pass', 'Gaming', 'https://cdn.simpleicons.org/xbox', 'https://xbox.com/gamepass', '#107C10', 230),
  ('playstation', 'PlayStation Plus', 'Gaming', 'https://cdn.simpleicons.org/playstation', 'https://playstation.com/ps-plus', '#0070D1', 240),
  ('nintendo', 'Nintendo Switch Online', 'Gaming', 'https://cdn.simpleicons.org/nintendoswitch', 'https://nintendo.com', '#E60012', 250),
  ('dazn', 'DAZN', 'Sport', 'https://cdn.simpleicons.org/dazn', 'https://dazn.com', '#F8F8F5', 260),
  ('beinsports', 'beIN SPORTS', 'Sport', 'https://www.google.com/s2/favicons?domain=beinsports.com&sz=128', 'https://beinsports.com', '#5C2D91', 270),
  ('orange', 'Orange', 'Télécom', 'https://cdn.simpleicons.org/orange', 'https://orange.fr', '#FF7900', 280),
  ('free', 'Free', 'Télécom', 'https://www.google.com/s2/favicons?domain=free.fr&sz=128', 'https://free.fr', '#CD1F2B', 290),
  ('sfr', 'SFR', 'Télécom', 'https://www.google.com/s2/favicons?domain=sfr.fr&sz=128', 'https://sfr.fr', '#E2001A', 300),
  ('bouygues', 'Bouygues Telecom', 'Télécom', 'https://www.google.com/s2/favicons?domain=bouyguestelecom.fr&sz=128', 'https://bouyguestelecom.fr', '#009FE3', 310),
  ('redsfr', 'RED by SFR', 'Télécom', 'https://www.google.com/s2/favicons?domain=red-by-sfr.fr&sz=128', 'https://www.red-by-sfr.fr', '#EF3123', 320),
  ('redsfr-mobile', 'RED by SFR Mobile', 'Télécom', 'https://www.google.com/s2/favicons?domain=red-by-sfr.fr&sz=128', 'https://www.red-by-sfr.fr', '#EF3123', 321),
  ('redsfr-fixe', 'RED by SFR Fixe', 'Télécom', 'https://www.google.com/s2/favicons?domain=red-by-sfr.fr&sz=128', 'https://www.red-by-sfr.fr', '#EF3123', 322),
  ('matmut', 'Matmut', 'Assurance', 'https://www.google.com/s2/favicons?domain=matmut.fr&sz=128', 'https://www.matmut.fr', '#008E7D', 330),
  ('edf', 'EDF', 'Énergie', 'https://www.google.com/s2/favicons?domain=edf.fr&sz=128', 'https://particulier.edf.fr', '#FF7A00', 340),
  ('navigo', 'Navigo · Île-de-France Mobilités', 'Transport', 'https://www.google.com/s2/favicons?domain=iledefrance-mobilites.fr&sz=128', 'https://www.iledefrance-mobilites.fr', '#6E45FF', 350),
  ('basicfit', 'Basic-Fit', 'Fitness', 'https://www.google.com/s2/favicons?domain=basic-fit.com&sz=128', 'https://www.basic-fit.com/fr-fr', '#F58220', 360),
  ('opencode', 'OpenCode', 'IA', 'https://www.google.com/s2/favicons?domain=opencode.ai&sz=128', 'https://opencode.ai', '#111827', 370)
ON DUPLICATE KEY UPDATE name = VALUES(name), category = VALUES(category), logo = VALUES(logo), website = VALUES(website), color = VALUES(color), sort_order = VALUES(sort_order);
