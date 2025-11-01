import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Eye, Heart, Skull, Play, RotateCcw } from 'lucide-react-native';
import { saveScore, getPlayerName as loadPlayerName, setPlayerName as persistPlayerName, syncPendingScores } from '@/lib/storage';

const { width, height } = Dimensions.get('window');

type Ghost = {
  id: number;
  x: number;
  y: number;
  opacity: Animated.Value;
  speed: number;
};

type Knife = {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  rotationDeg: string; // for transform rotate
};

export default function GameScreen() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isBlinking, setIsBlinking] = useState(false);

  const blinkOpacity = useRef(new Animated.Value(1)).current;
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ghostIdCounter = useRef(0);
  const knifeIdCounter = useRef(0);
  const [knives, setKnives] = useState<Knife[]>([]);

  const startGame = () => {
    setGameState('playing');
    setLives(3);
    setScore(0);
    setGhosts([]);
    ghostIdCounter.current = 0;
    setStartTime(Date.now());
    setDifficultyMultiplier(1);
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

    const baseSpeed = 1 + Math.random() * 2;
    const newGhost: Ghost = {
      id: ghostIdCounter.current++,
      x,
      y,
      opacity: new Animated.Value(0),
      // new ghosts inherit current difficulty and cumulative speed boost
      speed: baseSpeed * difficultyMultiplier * speedBoost,
    };

    Animated.timing(newGhost.opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    setGhosts(prev => [...prev, newGhost]);
  };

  const tapGhost = (ghost: Ghost) => {
    // remove the tapped ghost
    setGhosts(prev => prev.filter(g => g.id !== ghost.id));
    setScore(prev => prev + 10);
    // increase global speed boost slightly each time player scores
    setSpeedBoost(prev => {
      const next = Number((prev + 0.02).toFixed(3));
      return next;
    });
    // immediately nudge existing ghosts to be a bit faster
    setGhosts(prev => prev.map(g => ({ ...g, speed: g.speed * 1.02 })));

    // throw a knife from center to the ghost position
    const cx = width / 2;
    const cy = height / 2;
    const kx = new Animated.Value(cx);
    const ky = new Animated.Value(cy);
    const angleRad = Math.atan2(ghost.y - cy, ghost.x - cx);
    const rotationDeg = `${(angleRad * 180) / Math.PI}deg`;
    const id = knifeIdCounter.current++;
    const knife: Knife = { id, x: kx, y: ky, rotationDeg };
    setKnives(prev => [...prev, knife]);

    Animated.parallel([
      Animated.timing(kx, { toValue: ghost.x, duration: 250, useNativeDriver: false }),
      Animated.timing(ky, { toValue: ghost.y, duration: 250, useNativeDriver: false }),
    ]).start(() => {
      // remove the knife after it reaches the target
      setKnives(prev => prev.filter(k => k.id !== id));
    });

    // small haptic feedback on hit
    try { Haptics.selectionAsync(); } catch {}
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
    // preload saved player name and attempt sync of pending scores
    loadPlayerName().then(name => setPlayerName(name));
    syncPendingScores().catch(() => {});
  }, []);

  // difficulty ramp
  const [startTime, setStartTime] = useState<number | null>(null);
  const [difficultyMultiplier, setDifficultyMultiplier] = useState(1);
  // cumulative speed boost that increases every time player scores
  const [speedBoost, setSpeedBoost] = useState(1);

  useEffect(() => {
    if (gameState !== 'playing' || startTime == null) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      // increase multiplier slowly over time (caps at 3x)
      const mult = Math.min(1 + elapsed * 0.02, 3);
      setDifficultyMultiplier(mult);
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, startTime]);

  useEffect(() => {
    if (gameState === 'playing') {
      const spawnInterval = setInterval(() => {
        const baseChance = 0.6;
        const spawnChance = Math.min(baseChance + 0.1 * (difficultyMultiplier - 1), 0.95);
        if (Math.random() < spawnChance) {
          spawnGhost();
        }
      }, Math.max(250, 600 - (difficultyMultiplier - 1) * 150));

      gameLoopRef.current = setInterval(() => {
        setGhosts(prev => {
          const updated = prev.map(ghost => {
            const dx = width / 2 - ghost.x;
            const dy = height / 2 - ghost.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50) {
              setLives(current => {
                const newLives = current - 1;
                // haptic on life lost
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                if (newLives <= 0) {
                  setTimeout(() => endGame(), 100);
                }
                return newLives;
              });
              return null;
            }

            // guard against extremely small distances
            const safeDistance = distance || 1;
            return {
              ...ghost,
              x: ghost.x + (dx / safeDistance) * ghost.speed,
              y: ghost.y + (dy / safeDistance) * ghost.speed,
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
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#777"
            value={playerName}
            onChangeText={(t) => setPlayerName(t)}
            onBlur={() => persistPlayerName(playerName)}
            returnKeyType="done"
            maxLength={20}
            autoCorrect={false}
          />
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
    <View style={styles.gameContainer}>
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

      {/* Static knives around the player */}
      {[0, 90, 180, 270].map((deg, idx) => {
        const r = 50;
        const rad = (deg * Math.PI) / 180;
        const cx = width / 2;
        const cy = height / 2;
        const kx = cx + r * Math.cos(rad);
        const ky = cy + r * Math.sin(rad);
        return (
          <View
            key={`static-knife-${idx}`}
            style={[
              styles.knife,
              {
                left: kx - 15,
                top: ky - 3,
                transform: [{ rotate: `${deg}deg` }],
              },
            ]}
          />
        );
      })}

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
          <Pressable onPress={() => tapGhost(ghost)}>
            <Skull size={50} color="#00ff00" />
          </Pressable>
        </Animated.View>
      ))}

      {/* Knife projectiles */}
      {knives.map(k => (
        <Animated.View
          key={k.id}
          style={[
            styles.knife,
            {
              left: Animated.add(k.x, new Animated.Value(-15)),
              top: Animated.add(k.y, new Animated.Value(-3)),
              transform: [{ rotate: k.rotationDeg }],
            },
          ]}
        />
      ))}
    </View>
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
  input: {
    width: 260,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    borderWidth: 1,
    borderColor: '#330000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
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
  knife: {
    position: 'absolute',
    width: 30,
    height: 6,
    backgroundColor: '#cccccc',
    borderRadius: 3,
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#aaaaaa',
  },
});
