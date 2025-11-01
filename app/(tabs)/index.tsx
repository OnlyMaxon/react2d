import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { Eye, Heart, Skull, Play, RotateCcw } from 'lucide-react-native';
import { saveScore } from '@/lib/storage';

const { width, height } = Dimensions.get('window');

type Ghost = {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  speed: number;
};

export default function GameScreen() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isBlinking, setIsBlinking] = useState(false);

  const blinkOpacity = useRef(new Animated.Value(1)).current;
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const ghostIdCounter = useRef(0);

  const startGame = () => {
    setGameState('playing');
    setLives(3);
    setScore(0);
    setGhosts([]);
    ghostIdCounter.current = 0;
  };

  const endGame = async () => {
    setGameState('gameOver');
    if (gameLoopRef.current) {
      clearInterval(gameLoopRef.current);
    }

    if (score > 0) {
      await saveScore(playerName, score);
    }
  };

  const spawnGhost = () => {
    const side = Math.random();
    let x, y;

    if (side < 0.25) {
      x = -50;
      y = Math.random() * (height - 200);
    } else if (side < 0.5) {
      x = width + 50;
      y = Math.random() * (height - 200);
    } else if (side < 0.75) {
      x = Math.random() * width;
      y = -50;
    } else {
      x = Math.random() * width;
      y = height + 50;
    }

    const newGhost: Ghost = {
      id: ghostIdCounter.current++,
      x,
      y,
      opacity: new Animated.Value(0),
      speed: 1 + Math.random() * 2,
    };

    Animated.timing(newGhost.opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setGhosts(prev => [...prev, newGhost]);
  };

  const tapGhost = (ghostId: number) => {
    setGhosts(prev => prev.filter(g => g.id !== ghostId));
    setScore(prev => prev + 10);
    triggerBlink();
  };

  const triggerBlink = () => {
    setIsBlinking(true);
    Animated.sequence([
      Animated.timing(blinkOpacity, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(blinkOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => setIsBlinking(false));
  };

  useEffect(() => {
    if (gameState === 'playing') {
      const spawnInterval = setInterval(() => {
        if (Math.random() < 0.3) {
          spawnGhost();
        }
      }, 1000);

      gameLoopRef.current = setInterval(() => {
        setGhosts(prev => {
          const updated = prev.map(ghost => {
            const dx = width / 2 - ghost.x;
            const dy = height / 2 - ghost.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50) {
              setLives(current => {
                const newLives = current - 1;
                if (newLives <= 0) {
                  setTimeout(() => endGame(), 100);
                }
                return newLives;
              });
              return null;
            }

            return {
              ...ghost,
              x: ghost.x + (dx / distance) * ghost.speed,
              y: ghost.y + (dy / distance) * ghost.speed,
            };
          }).filter(Boolean) as Ghost[];

          return updated;
        });
      }, 50);

      return () => {
        clearInterval(spawnInterval);
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
        }
      };
    }
  }, [gameState]);

  if (gameState === 'menu') {
    return (
      <View style={styles.container}>
        <View style={styles.menuContent}>
          <Skull size={80} color="#ff0000" />
          <Text style={styles.title}>THE HAUNTING</Text>
          <Text style={styles.subtitle}>Survive the ghosts...</Text>
          <Pressable style={styles.button} onPress={startGame}>
            <Play size={24} color="#fff" />
            <Text style={styles.buttonText}>START GAME</Text>
          </Pressable>
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>Tap ghosts before they reach you</Text>
            <Text style={styles.instructionText}>You have 3 lives</Text>
          </View>
        </View>
      </View>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <View style={styles.container}>
        <View style={styles.menuContent}>
          <Skull size={80} color="#ff0000" />
          <Text style={styles.gameOverText}>GAME OVER</Text>
          <Text style={styles.finalScore}>Score: {score}</Text>
          <Pressable style={styles.button} onPress={startGame}>
            <RotateCcw size={24} color="#fff" />
            <Text style={styles.buttonText}>PLAY AGAIN</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.gameContainer, { opacity: blinkOpacity }]}>
      <View style={styles.hud}>
        <View style={styles.livesContainer}>
          {[...Array(lives)].map((_, i) => (
            <Heart key={i} size={24} color="#ff0000" fill="#ff0000" />
          ))}
        </View>
        <Text style={styles.scoreText}>Score: {score}</Text>
      </View>

      <View style={styles.centerMarker}>
        <Eye size={40} color="#ff0000" />
      </View>

      {ghosts.map(ghost => (
        <Animated.View
          key={ghost.id}
          style={[
            styles.ghost,
            {
              left: ghost.x - 25,
              top: ghost.y - 25,
              opacity: ghost.opacity,
            },
          ]}>
          <Pressable onPress={() => tapGhost(ghost.id)}>
            <Skull size={50} color="#00ff00" />
          </Pressable>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff0000',
    marginTop: 20,
    marginBottom: 10,
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#999',
    marginBottom: 40,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#660000',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#ff0000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructions: {
    marginTop: 40,
    alignItems: 'center',
  },
  instructionText: {
    color: '#666',
    fontSize: 14,
    marginVertical: 5,
  },
  gameOverText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ff0000',
    marginTop: 20,
    marginBottom: 20,
  },
  finalScore: {
    fontSize: 32,
    color: '#fff',
    marginBottom: 30,
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  livesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  centerMarker: {
    position: 'absolute',
    top: height / 2 - 20,
    left: width / 2 - 20,
    zIndex: 100,
  },
  ghost: {
    position: 'absolute',
    zIndex: 10,
  },
});
