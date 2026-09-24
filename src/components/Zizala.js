// Zizala.js - Žížala game - samostatný soubor
// Umísti do: src/components/Zizala.js
// Použití v UzivatelPin.js: import ZizalaGame from '../components/Zizala'

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
const BOARD_ROWS = 20;
const CELL = 18;
const GAP = 2;
const SPEED_START = 180;
const SPEED_STEP = 3;
const POINTS_PER_FOOD = 10;

const COLORS = {
  head: '#FF1493', // nejvíce růžová - hlava
  body1: '#FF69B4',
  body2: '#FFB6C1',
  tail: '#FFD6E7',
  food: '#39FF14',
  foodInner: '#8AFF8A',
  bg: '#0A0A0A',
  gridLine: '#151515',
  wall: '#1A1A1A',
  text: '#FFFFFF',
  dim: '#888888',
};

// Supabase client pro high score - použije EXPO_PUBLIC_ proměnné, fallback na prázdno
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

const ZizalaGame = ({ onClose, userId, deviceId, hideControls = false, onDirRef }) => {
  const [snake, setSnake] = useState([
    { x: 7, y: 10 },
    { x: 6, y: 10 },
    { x: 5, y: 10 },
  ]);
  const [food, setFood] = useState(() => getRandomFood([{ x: 7, y: 10 }, { x: 6, y: 10 }, { x: 5, y: 10 }]));
  const [dir, setDir] = useState({ x: 1, y: 0 }); // doprava
  const dirRef = useRef({ x: 1, y: 0 });
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [nick, setNick] = useState(['', '', '']);
  const [highScores, setHighScores] = useState([]);
  const [speed, setSpeed] = useState(SPEED_START);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);
  const inputRefs = useRef([]);

  const nextDirRef = useRef({ x: 1, y: 0 });

  useEffect(() => {
    dirRef.current = dir;
  }, [dir]);

  useEffect(() => {
    // fade in board
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    fetchScores();
    return () => clearInterval(loopRef.current);
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

  const resetGame = () => {
    const startSnake = [
      { x: 7, y: 10 },
      { x: 6, y: 10 },
      { x: 5, y: 10 },
    ];
    setSnake(startSnake);
    setFood(getRandomFood(startSnake));
    setDir({ x: 1, y: 0 });
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    setScore(0);
    setSpeed(SPEED_START);
    setGameOver(false);
    setIsPlaying(true);
  };

  const startGame = () => {
    resetGame();
  };

  const move = useCallback(() => {
    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newDir = nextDirRef.current;
      const newHead = { x: head.x + newDir.x, y: head.y + newDir.y };

      // zeď = konec
      if (newHead.x < 0 || newHead.x >= BOARD_COLS || newHead.y < 0 || newHead.y >= BOARD_ROWS) {
        setIsPlaying(false);
        setGameOver(true);
        clearInterval(loopRef.current);
        return prevSnake;
      }
      // sebe = konec
      if (prevSnake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        setIsPlaying(false);
        setGameOver(true);
        clearInterval(loopRef.current);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // jídlo?
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + POINTS_PER_FOOD);
        setSpeed((sp) => Math.max(70, sp - SPEED_STEP));
        setFood(getRandomFood(newSnake));
        // neodebíráme ocas = roste
        return newSnake;
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
    // zákaz otočit se o 180°
    if (newDir.x === -dirRef.current.x && newDir.y === -dirRef.current.y) return;
    nextDirRef.current = newDir;
    setDir(newDir);
  };

  useEffect(() => {
    if (onDirRef) {
      onDirRef.current = changeDir;
    }
  }, [isPlaying, onDirRef]);

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
    if (finalNick.length !== 3) {
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
      Alert.alert('Uloženo', `${finalNick} - ${score} bodů v high score!`);
      setNick(['', '', '']);
      setGameOver(false);
      // po uložení může zavřít nebo znovu hrát
    } catch (e) {
      Alert.alert('Chyba ukládání', e?.message || 'Nepodařilo se uložit');
    }
  };

  const getCellColor = (x, y, index) => {
    if (index === 0) return COLORS.head; // hlava nejvíce růžová
    if (index === 1) return COLORS.body1;
    if (index === 2) return COLORS.body2;
    return COLORS.tail;
  };

  const isSnakeCell = (x, y) => {
    const idx = snake.findIndex((s) => s.x === x && s.y === y);
    return idx;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>ŽÍŽALA</Text>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreLabel}>SKÓRE</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      <View style={styles.boardWrapper}>
        <View style={styles.board}>
          {Array.from({ length: BOARD_ROWS }).map((_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: BOARD_COLS }).map((_, col) => {
                const snakeIdx = isSnakeCell(col, row);
                const isFood = food.x === col && food.y === row;
                const isSnake = snakeIdx !== -1;
                return (
                  <View
                    key={`${col}-${row}`}
                    style={[
                      styles.cell,
                      isSnake
                        ? { backgroundColor: getCellColor(col, row, snakeIdx), borderColor: snakeIdx === 0 ? '#FFF' : 'transparent' }
                        : { backgroundColor: COLORS.bg },
                      isFood && styles.foodCell,
                    ]}
                  >
                    {isFood && <View style={styles.foodInner} />}
                    {isSnake && snakeIdx === 0 && <View style={styles.headDot} />}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {!isPlaying && !gameOver && (
        <TouchableOpacity style={styles.startBtn} onPress={startGame}>
          <Text style={styles.startBtnText}>HRÁT ŽÍŽALU</Text>
        </TouchableOpacity>
      )}

      {gameOver && (
        <View style={styles.gameOverBox}>
          <Text style={styles.gameOverTitle}>KONEC!</Text>
          <Text style={styles.gameOverScore}>Skóre: {score}</Text>
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
            <TouchableOpacity style={[styles.btn, styles.btnAgain]} onPress={resetGame}>
              <Text style={styles.btnText}>HRÁT ZNOVU</Text>
            </TouchableOpacity>
            {onClose && (
              <TouchableOpacity style={[styles.btn, styles.btnClose]} onPress={onClose}>
                <Text style={styles.btnText}>ZAVŘÍT</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {isPlaying && !hideControls && (
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

      {onClose && !isPlaying && !gameOver && (
        <TouchableOpacity style={styles.closeLink} onPress={onClose}>
          <Text style={styles.closeLinkText}>← Zpět do chatu</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: BOARD_COLS * (CELL + GAP) + GAP,
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: COLORS.head,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  scoreBox: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.head,
    alignItems: 'center',
  },
  scoreLabel: {
    color: COLORS.dim,
    fontSize: 10,
    letterSpacing: 1,
  },
  scoreValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  boardWrapper: {
    backgroundColor: '#000',
    padding: GAP,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#222',
  },
  board: {
    backgroundColor: COLORS.bg,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL,
    height: CELL,
    margin: GAP / 2,
    borderRadius: 3,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodCell: {
    backgroundColor: COLORS.food,
    borderColor: '#FFF',
    shadowColor: COLORS.food,
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  foodInner: {
    width: 8,
    height: 8,
    backgroundColor: COLORS.foodInner,
    borderRadius: 4,
  },
  headDot: {
    width: 4,
    height: 4,
    backgroundColor: '#FFF',
    borderRadius: 2,
  },
  startBtn: {
    marginTop: 16,
    backgroundColor: COLORS.head,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  startBtnText: {
    color: '#FFF',
    fontWeight: '900',
    letterSpacing: 2,
    fontSize: 16,
  },
  controls: {
    marginTop: 14,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtn: {
    width: 64,
    height: 48,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  arrowText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  arrowSpacer: {
    width: 64,
    height: 48,
    margin: 4,
  },
  gameOverBox: {
    marginTop: 16,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: COLORS.head,
    borderRadius: 12,
    padding: 16,
    width: BOARD_COLS * (CELL + GAP) + 16,
    alignItems: 'center',
  },
  gameOverTitle: {
    color: COLORS.head,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
  },
  gameOverScore: {
    color: '#FFF',
    fontSize: 18,
    marginTop: 6,
    fontWeight: '700',
  },
  nickPrompt: {
    color: COLORS.dim,
    marginTop: 12,
    fontSize: 14,
    letterSpacing: 1,
  },
  nickRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
  },
  nickInput: {
    width: 48,
    height: 52,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: COLORS.head,
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    borderRadius: 6,
    textAlign: 'center',
  },
  gameOverBtns: {
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  btn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSave: {
    backgroundColor: COLORS.head,
  },
  btnAgain: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#444',
  },
  btnClose: {
    backgroundColor: '#111',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 13,
  },
  highScoreBox: {
    marginTop: 18,
    width: BOARD_COLS * (CELL + GAP) + 16,
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  highScoreTitle: {
    color: COLORS.dim,
    fontSize: 11,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  highScoreEmpty: {
    color: '#555',
    textAlign: 'center',
    fontSize: 12,
  },
  highScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  highScoreRank: {
    color: COLORS.dim,
    width: 24,
    fontSize: 12,
  },
  highScoreNick: {
    color: '#FFF',
    fontWeight: '800',
    flex: 1,
    letterSpacing: 1,
  },
  highScorePoints: {
    color: COLORS.head,
    fontWeight: 'bold',
  },
  closeLink: {
    marginTop: 12,
  },
  closeLinkText: {
    color: COLORS.dim,
    fontSize: 12,
  },
});

export default ZizalaGame;
