-- 002_anonymize_players.sql
-- Replace all real player names with sequential "玩家XX" per room.
-- Idempotent: re-running produces the same names.

DO $$
DECLARE
  room_record RECORD;
  player_record RECORD;
  counter INTEGER;
BEGIN
  FOR room_record IN SELECT id FROM rooms ORDER BY created_at
  LOOP
    counter := 1;
    FOR player_record IN
      SELECT id FROM players
      WHERE room_id = room_record.id
      ORDER BY created_at ASC
    LOOP
      UPDATE players
      SET name = '玩家' || LPAD(counter::TEXT, 2, '0')
      WHERE id = player_record.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;
