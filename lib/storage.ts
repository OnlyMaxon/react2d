import AsyncStorage from '@react-native-async-storage/async-storage';

export type Score = {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
};

const SCORES_KEY = '@horror_game_scores';

export const saveScore = async (playerName: string, score: number): Promise<void> => {
  try {
    const existingScores = await getScores();
    const newScore: Score = {
      id: Date.now().toString(),
      player_name: playerName || 'Anonymous',
      score,
      created_at: new Date().toISOString(),
    };
    const updatedScores = [...existingScores, newScore];
    await AsyncStorage.setItem(SCORES_KEY, JSON.stringify(updatedScores));
  } catch (error) {
    console.error('Error saving score:', error);
  }
};

export const getScores = async (): Promise<Score[]> => {
  try {
    const scoresJson = await AsyncStorage.getItem(SCORES_KEY);
    if (!scoresJson) return [];
    return JSON.parse(scoresJson).sort((a: Score, b: Score) => b.score - a.score);
  } catch (error) {
    console.error('Error getting scores:', error);
    return [];
  }
};

export const clearScores = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SCORES_KEY);
  } catch (error) {
    console.error('Error clearing scores:', error);
  }
};
