// Zizala.js - Žížala game - upraveno dle požadavku
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  Animated,
  Alert,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';

const BOARD_COLS = 15;
const BOARD_ROWS = 15;
const SPEED_START = 200;
const SPEED_STEP = 4;
const POINTS_PER_FOOD = 10;

const COLORS = {
  head: '#ff69b4',
  body1: '#ff8da1',
  body2: '#ffb6c1',
  tail: '#ffc0cb',
  food: '#e60000',
  foodInner: '#ff4d4d',
  bg: '#0a0a0a',
  boardBg: '#1a1a1a',
  text: '#000',
  dim: '#666',
  countdown: '#ff3b30',
};

let supabase = null;
try {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    supabase = createClient(url, anon);
  }
} catch {}

const getRandomFood = (snake) => {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * BOARD_COLS),
      y: Math.floor(Math.random() * BOARD_ROWS),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
};

const ZizalaGame = ({ onClose, userId, deviceId, hideControls = false, onDirRef = null }) => {
  const [snake, setSnake] = useState([
    { x: 7, y: 7 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
  ]);
  const [food, setFood] = useState(() => getRandomFood([{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }]));
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const dirRef = useRef({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [countdown, setCountdown] = useState(null); // 5..0
  const [nick, setNick] = useState(['', '', '']);
  const [highScores, setHighScores] = useState([]);
  const [speed, setSpeed] = useState(SPEED_START);
  const [showHighScoreAfterSave, setShowHighScoreAfterSave] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);
  const countdownRef = useRef(null);
  const inputRefs = useRef([]);
  const nextDirRef = useRef({ x: 1, y: 0 });

  useEffect(() => {
    dirRef.current = dir;
  }, [dir]);

  useEffect(() => {
    if (onDirRef) {
      onDirRef.current = (d) => changeDir(d);
    }
    return () => {
      if (onDirRef) onDirRef.current = null;
    };
  }, [onDirRef, isPlaying]);

  useEffect(() => {
    if (onDirRef) {
      onDirRef.current = (d) => changeDir(d);
    }
  }, [onDirRef, isPlaying, dir]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    fetchScores();
    return () => {
      clearInterval(loopRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  const fetchScores = async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('zizala_scores')
        .select('nickname, score, created_at')
        .order('score', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(10);
      if (data) setHighScores(data);
    } catch {}
  };

  const resetGameState = () => {
    const startSnake = [
      { x: 7, y: 7 },
      { x: 6, y: 7 },
      { x: 5, y: 7 },
    ];
    setSnake(startSnake);
    setFood(getRandomFood(startSnake));
    setDir({ x: 1, y: 0 });
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    setScore(0);
    setSpeed(SPEED_START);
    setGameOver(false);
  };

  const startCountdown = () => {
    resetGameState();
    setIsPlaying(false);
    setGameOver(false);
    setCountdown(5);
    clearInterval(loopRef.current);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setCountdown(null);
          setIsPlaying(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

    const move = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newDir = nextDirRef.current;
      let newHead = { x: head.x + newDir.x, y: head.y + newDir.y };

      // WRAP - projedu nahoru = vyjizdim dole, doleva = vpravo atd
      if (newHead.x < 0) newHead.x = BOARD_COLS - 1;
      if (newHead.x >= BOARD_COLS) newHead.x = 0;
      if (newHead.y < 0) newHead.y = BOARD_ROWS - 1;
      if (newHead.y >= BOARD_ROWS) newHead.y = 0;

      if (prevSnake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setIsPlaying(false);
        setGameOver(true);
        clearInterval(loopRef.current);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + POINTS_PER_FOOD);
        setSpeed((sp) => Math.max(70, sp - SPEED_STEP));
        setFood(getRandomFood(newSnake));
        return newSnake; // +1 ctverecek
      } else {
        newSnake.pop();
        return newSnake;
      }
    });
  }, [food]);

  useEffect(() => {
    if (!isPlaying) return;
    clearInterval(loopRef.current);
    loopRef.current = setInterval(move, speed);
    return () => clearInterval(loopRef.current);
  }, [isPlaying, speed, move]);

  const changeDir = (newDir) => {
    if (!isPlaying) return;
    if (newDir.x === -dirRef.current.x && newDir.y === -dirRef.current.y) return;
    nextDirRef.current = newDir;
    setDir(newDir);
  };

  const handleNickChange = (index, val) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const next = [...nick];
    next[index] = clean;
    setNick(next);
    if (clean && index < 2) {
      inputRefs.current[index + 1]?.focus();
    }
  };

 const saveScore = async () => {
    const finalNick = nick.join('').trim();
    if (finalNick.length!== 3) {
      Alert.alert('Chyba', 'Vyplň 3 písmena - _ _ _');
      return;
    }
    try {
      if (supabase) {
        const { error } = await supabase.from('zizala_scores').insert({
          nickname: finalNick,
          score: score,
          user_id: userId || null,
          device_id: deviceId || null,
        });
        if (error) throw error;
      }
      await fetchScores();
      setNick(['', '', '']);
      setGameOver(false);
      setShowHighScoreAfterSave(true);
    } catch (e) {
      Alert.alert('Chyba', e?.message || 'Nepodařilo se uložit');
    }
  };

  const handleOkHighScore = () => {
    setShowHighScoreAfterSave(false);
    resetGameState();
  };

  const isSnakeCell = (x, y) => {
    return snake.findIndex((s) => s.x === x && s.y === y);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, hideControls && { padding: 0, borderWidth: 0, flex: 1, height: '100%' }]}>
      <View style={styles.header}>
        <Text style={styles.title}>ŽÍŽALA</Text>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SKÓRE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      <View style={[styles.boardWrapper, hideControls && { flex: 1, aspectRatio: undefined, height: '100%', width: '100%' }]}>
        <View style={styles.board}>
          {Array.from({ length: BOARD_ROWS }).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: BOARD_COLS }).map((_, col) => {
                const snakeIdx = isSnakeCell(col, row);
                const isFood = food.x === col && food.y === row;
                const isSnake = snakeIdx !== -1;
                const isHead = snakeIdx === 0;

                let headRotation = '0deg';
                if (dir.x === 1) headRotation = '90deg';
                else if (dir.x === -1) headRotation = '270deg';
                else if (dir.y === 1) headRotation = '180deg';
                else if (dir.y === -1) headRotation = '0deg';

                return (
                  <View
                    key={`${col}-${row}`}
                    style={[
                      styles.cell,
                      isSnake
                        ? { backgroundColor: isHead ? COLORS.head : snakeIdx % 2 === 0 ? COLORS.body1 : COLORS.body2 }
                        : { backgroundColor: COLORS.boardBg },
                      isFood && styles.foodCell,
                    ]}
                  >
                    {isHead && (
                      <View
                        style={[
                          styles.headTriangle,
                          { transform: [{ rotate: headRotation }] },
                        ]}
                      />
                    )}
                    {isFood && <View style={styles.foodInner} />}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        {countdown !== null && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownLabel}>START ZA</Text>
          </View>
        )}
      </View>

      {!isPlaying && !gameOver && countdown === null && (
        <TouchableOpacity style={styles.startBtn} onPress={startCountdown}>
          <Text style={styles.startBtnText}>HRÁT</Text>
        </TouchableOpacity>
      )}

      {gameOver && (
        <View style={styles.gameOverBox}>
          <Text style={styles.gameOverTitle}>KONEC!</Text>
          <Text style={styles.gameOverScore}>Skóre: {score} | Čtverečků: {snake.length}</Text>
          <Text style={styles.nickPrompt}>Zadej přezdívku _ _ _</Text>
          <View style={styles.nickRow}>
            {[0, 1, 2].map((i) => (
              <TextInput
                key={i}
                ref={(r) => (inputRefs.current[i] = r)}
                style={styles.nickInput}
                value={nick[i]}
                onChangeText={(v) => handleNickChange(i, v)}
                maxLength={1}
                autoCapitalize="characters"
                placeholder="_"
                placeholderTextColor="#555"
                textAlign="center"
              />
            ))}
          </View>
          <View style={styles.gameOverBtns}>
            <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={saveScore}>
              <Text style={styles.btnText}>ULOŽIT DO HIGH SCORE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnAgain]} onPress={startCountdown}>
              <Text style={styles.btnText}>HRÁT ZNOVU</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

           {!hideControls && (isPlaying || countdown!== null) && (
        <View style={styles.controlsPanel}>
          <Text style={styles.controlsTitle}>OVLÁDÁNÍ - panel hodnocení</Text>
          <View style={styles.controls}>
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDir({ x: 0, y: -1 })}>
                <Text style={styles.arrowText}>▲</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDir({ x: -1, y: 0 })}>
                <Text style={styles.arrowText}>◀</Text>
              </TouchableOpacity>
              <View style={styles.arrowSpacer} />
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDir({ x: 1, y: 0 })}>
                <Text style={styles.arrowText}>▶</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.arrowBtn} onPress={() => changeDir({ x: 0, y: 1 })}>
                <Text style={styles.arrowText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.controlsHint}>Sbírej červená jablíčka ■ = +1 čtvereček</Text>
        </View>
      )}

      <View style={styles.highScoreBox}>
        <Text style={styles.highScoreTitle}>HIGH SCORE TOP 10</Text>
        {highScores.length === 0 ? (
          <Text style={styles.highScoreEmpty}>Zatím nikdo - buď první!</Text>
        ) : (
          highScores.map((item, idx) => (
            <View key={idx} style={styles.highScoreRow}>
              <Text style={styles.highScoreRank}>{idx + 1}.</Text>
              <Text style={styles.highScoreNick}>{item.nickname}</Text>
              <Text style={styles.highScorePoints}>{item.score}</Text>
            </View>
          ))
        )}
      </View>
    </Animated.View>
  );
};

const CELL_SIZE = Dimensions.get('window').width / (BOARD_COLS + 4);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#ece9d8',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scoreBox: {
    backgroundColor: '#fffdf5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#666',
    fontSize: 9,
    fontWeight: '900',
  },
  scoreValue: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  boardWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    padding: 4,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#777',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  board: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    margin: 0.5,
    borderWidth: 0.5,
    borderColor: '#2a2a2a',
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
  },
  foodCell: {
    backgroundColor: '#cc0000',
    borderColor: '#ff6666',
    borderWidth: 1,
    borderRadius: 8,
  },
  foodInner: {
    width: '50%',
    height: '50%',
    backgroundColor: '#ff4d4d',
    borderRadius: 4,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  countdownText: {
    color: '#fff',
    fontSize: 72,
    fontWeight: '900',
  },
  countdownLabel: {
    color: '#ff0000',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 8,
    letterSpacing: 2,
  },
  startBtn: {
    marginTop: 12,
    backgroundColor: '#2f9e44',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 16,
  },
  controlsPanel: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#fffdf5',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    padding: 8,
    alignItems: 'center',
  },
  controlsTitle: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
  },
  controls: {
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtn: {
    width: 64,
    height: 44,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
  },
  arrowText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
  },
  arrowSpacer: {
    width: 64,
    height: 44,
    margin: 3,
  },
  controlsHint: {
    marginTop: 6,
    color: '#ff0000',
    fontSize: 10,
    fontWeight: '800',
  },
  gameOverBox: {
    marginTop: 12,
    backgroundColor: '#fffdf5',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    padding: 12,
    width: '100%',
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#ff0000',
    fontSize: 20,
    fontWeight: '900',
  },
  gameOverScore: {
    color: '#000',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '800',
  },
  nickPrompt: {
    color: '#666',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
  },
  nickRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  nickInput: {
    width: 44,
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    color: '#000',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  gameOverBtns: {
    width: '100%',
    marginTop: 12,
    gap: 6,
  },
  btn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
  },
  btnSave: {
    backgroundColor: '#2f9e44',
  },
  btnAgain: {
    backgroundColor: '#ece9d8',
  },
  btnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
  },
  highScoreBox: {
    marginTop: 10,
    width: '100%',
    backgroundColor: '#fffdf5',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    padding: 8,
  },
  highScoreTitle: {
    color: '#000',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  highScoreEmpty: {
    color: '#666',
    textAlign: 'center',
    fontSize: 11,
  },
  highScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  highScoreRank: {
    color: '#666',
    width: 20,
    fontSize: 11,
    fontWeight: '800',
  },
  highScoreNick: {
    color: '#000',
    fontWeight: '900',
    flex: 1,
    fontSize: 11,
  },
  highScorePoints: {
    color: '#ff0000',
    fontWeight: '900',
    fontSize: 11,
  },
});

export default ZizalaGame;
