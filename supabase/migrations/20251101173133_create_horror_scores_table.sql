/*
  # Create Horror Game Leaderboard

  1. New Tables
    - `horror_scores`
      - `id` (uuid, primary key)
      - `player_name` (text)
      - `score` (integer)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `horror_scores` table
    - Add policy for anyone to read scores
    - Add policy for anyone to insert scores (public game)
  
  3. Indexes
    - Add index on score for efficient leaderboard queries
*/

CREATE TABLE IF NOT EXISTS horror_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL DEFAULT 'Anonymous',
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE horror_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scores"
  ON horror_scores
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert scores"
  ON horror_scores
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS horror_scores_score_idx ON horror_scores(score DESC);
