import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type Score = {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
};

const SCORES_KEY = '@horror_game_scores';
const PLAYER_NAME_KEY = '@horror_player_name';
const PENDING_KEY = '@horror_game_pending_scores';

async function saveScoreRemote(playerName: string, score: number): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('horror_scores').insert({
      player_name: playerName || 'Anonymous',
      score,
    });
    if (error) {
      console.error('Supabase insert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase insert exception:', err);
    return false;
  }
}

async function getScoresRemote(): Promise<Score[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('horror_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(100);
    if (error) {
      console.error('Supabase select error:', error);
      return null;
    }
    return (data ?? []) as Score[];
  } catch (err) {
    console.error('Supabase select exception:', err);
    return null;
  }
}

export const saveScore = async (playerName: string, score: number): Promise<boolean> => {
  try {
    const newScore: Score = {
      id: Date.now().toString(),
      player_name: playerName || 'Anonymous',
      score,
      created_at: new Date().toISOString(),
    };

    // Try remote first
    const remoteOK = await saveScoreRemote(playerName, score);

    // Always persist locally as canonical cache
    const existingScores = await getScoresLocal();
    const updatedScores = [...existingScores, newScore];
    await AsyncStorage.setItem(SCORES_KEY, JSON.stringify(updatedScores));

    if (!remoteOK) {
      // queue for later sync
      try {
        const pendingJson = await AsyncStorage.getItem(PENDING_KEY);
        const pending: Score[] = pendingJson ? JSON.parse(pendingJson) : [];
        pending.push(newScore);
        await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      } catch (err) {
        console.error('Error queueing pending score:', err);
      }
    }

    return remoteOK;
  } catch (error) {
    console.error('Error saving score:', error);
    return false;
  }
};

async function getScoresLocal(): Promise<Score[]> {
  try {
    const scoresJson = await AsyncStorage.getItem(SCORES_KEY);
    if (!scoresJson) return [];
    return JSON.parse(scoresJson).sort((a: Score, b: Score) => b.score - a.score);
  } catch (error) {
    console.error('Error getting scores:', error);
    return [];
  }
};

export const getScores = async (): Promise<Score[]> => {
  // Prefer remote if available; otherwise use local
  const remote = await getScoresRemote();
  if (remote) return remote;
  return getScoresLocal();
};

export const clearScores = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SCORES_KEY);
  } catch (error) {
    console.error('Error clearing scores:', error);
  }
};

export const getPlayerName = async (): Promise<string> => {
  try {
    return (await AsyncStorage.getItem(PLAYER_NAME_KEY)) || '';
  } catch {
    return '';
  }
};

export const setPlayerName = async (name: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(PLAYER_NAME_KEY, name);
  } catch (error) {
    console.error('Error saving player name:', error);
  }
};

export const syncPendingScores = async (): Promise<void> => {
  if (!supabase) return;
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_KEY);
    if (!pendingJson) return;
    const pending: Score[] = JSON.parse(pendingJson);
    if (pending.length === 0) return;

    // attempt batch insert
    const inserts = pending.map(p => ({ player_name: p.player_name, score: p.score }));
    const { error } = await supabase.from('horror_scores').insert(inserts);
    if (error) {
      console.error('Error syncing pending scores:', error);
      return;
    }

    // clear pending upon success
    await AsyncStorage.removeItem(PENDING_KEY);
  } catch (err) {
    console.error('syncPendingScores exception:', err);
  }
};
