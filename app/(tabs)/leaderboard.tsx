import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, useFocusEffect } from 'react-native';
import { Trophy, Skull, Crown } from 'lucide-react-native';
import { getScores, type Score } from '@/lib/storage';

export default function LeaderboardScreen() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScores = async () => {
    try {
      const data = await getScores();
      setScores(data);
    } catch (error) {
      console.error('Error fetching scores:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchScores();
  };

  useFocusEffect(
    useCallback(() => {
      fetchScores();
    }, [])
  );

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown size={24} color="#FFD700" />;
    if (index === 1) return <Crown size={24} color="#C0C0C0" />;
    if (index === 2) return <Crown size={24} color="#CD7F32" />;
    return <Skull size={20} color="#666" />;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return '#FFD700';
    if (index === 1) return '#C0C0C0';
    if (index === 2) return '#CD7F32';
    return '#666';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ff0000" />
        <Text style={styles.loadingText}>Loading scores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Trophy size={40} color="#ff0000" />
        <Text style={styles.title}>LEADERBOARD</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff0000"
          />
        }>
        {scores.length === 0 ? (
          <View style={styles.emptyState}>
            <Skull size={60} color="#333" />
            <Text style={styles.emptyText}>No scores yet...</Text>
            <Text style={styles.emptySubtext}>Be the first to play!</Text>
          </View>
        ) : (
          scores.map((score, index) => (
            <View
              key={score.id}
              style={[
                styles.scoreCard,
                index < 3 && styles.topThreeCard,
              ]}>
              <View style={styles.rankContainer}>
                {getRankIcon(index)}
                <Text style={[styles.rank, { color: getRankColor(index) }]}>
                  #{index + 1}
                </Text>
              </View>
              <View style={styles.playerInfo}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {score.player_name}
                </Text>
                <Text style={styles.date}>
                  {new Date(score.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.score}>{score.score}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    gap: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#660000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff0000',
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0000',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#330000',
  },
  topThreeCard: {
    borderColor: '#660000',
    borderWidth: 2,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 8,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  playerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  date: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  score: {
    color: '#ff0000',
    fontSize: 24,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 20,
    marginTop: 20,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 5,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 20,
  },
});
