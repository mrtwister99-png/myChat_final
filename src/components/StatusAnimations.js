import React, { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';

const ON_FRAME_SOURCES = [
  require('../assets/anima/stav0.png'),
  require('../assets/anima/stav1.png'),
  require('../assets/anima/stav2.png'),
  require('../assets/anima/stav3.png'),
  require('../assets/anima/stav4.png'),
  require('../assets/anima/stav5.png'),
  require('../assets/anima/stav6.png'),
  require('../assets/anima/stav7.png'),
  require('../assets/anima/stav8.png'),
];

const OFF_FRAME_SOURCES = [
  require('../assets/anima/red0.png'),
  require('../assets/anima/red1.png'),
  require('../assets/anima/red2.png'),
  require('../assets/anima/red3.png'),
  require('../assets/anima/red4.png'),
  require('../assets/anima/red5.png'),
  require('../assets/anima/red6.png'),
  require('../assets/anima/red7.png'),
  require('../assets/anima/red8.png'),
  require('../assets/anima/red9.png'),
  require('../assets/anima/red10.png'),
  require('../assets/anima/red11.png'),
  require('../assets/anima/red12.png'),
  require('../assets/anima/red13.png'),
  require('../assets/anima/red14.png'),
];

const OFF_INTRO_DURATIONS = [350, 350, 400, 350, 400, 350, 200, 200, 200, 200, 300, 300, 350, 350, 350];
const OFF_LOOP_FRAMES = [{ index: 13, duration: 600 }, { index: 14, duration: 600 }];

const JOB_FRAME_SOURCES = {
  0: require('../assets/anima/job0.png'),
  '05': require('../assets/anima/job05.png'),
  1: require('../assets/anima/job1.png'),
  2: require('../assets/anima/job2.png'),
  3: require('../assets/anima/job3.png'),
  4: require('../assets/anima/job4.png'),
  5: require('../assets/anima/job5.png'),
  6: require('../assets/anima/job6.png'),
  7: require('../assets/anima/job7.png'),
  8: require('../assets/anima/job8.png'),
};

const JOB_INTRO_FRAMES = [{ key: 0, duration: 350 }];
const JOB_LOOP_FRAMES = [
  { key: '05', duration: 350 },
  { key: 7, duration: 350 },
  { key: 8, duration: 350 },
  { key: 6, duration: 350 },
  { key: 5, duration: 450 },
  { key: 2, duration: 350 },
  { key: 3, duration: 350 },
  { key: 4, duration: 350 },
];

const JOB_LOOP_DURATION = JOB_LOOP_FRAMES.reduce((sum, f) => sum + f.duration, 0);
const OFF_INTRO_DURATION = OFF_INTRO_DURATIONS.reduce((sum, d) => sum + d, 0);
const OFF_LOOP_DURATION = OFF_LOOP_FRAMES.reduce((sum, f) => sum + f.duration, 0);
const JOB_INTRO_DURATION = JOB_INTRO_FRAMES.reduce((sum, f) => sum + f.duration, 0);
const ON_ANIM_EPOCH = Date.now();

// FIX PROBLIKAVANI: driv se kazdy snimek delal vymenou <Image source>.
// Android pri kazde zmene source obrazek znovu dekoduje a navic ma
// defaultni fadeDuration 300 ms -> na zlomek vteriny prazdno = blikani.
// Ted jsou vsechny snimky vykreslene naraz pres sebe a meni se jen
// opacity. Zadne nacitani, zadny fade, zadne blikani.
const FrameStack = ({ sources, activeIndex, width, height, style }) => (
  <View style={[{ width, height }, style]}>
    {sources.map((source, index) => (
      <Image
        key={index}
        source={source}
        fadeDuration={0}
        resizeMode="contain"
        style={{
          position: 'absolute',
          width,
          height,
          opacity: index === activeIndex ? 1 : 0,
        }}
      />
    ))}
  </View>
);

const JOB_FRAME_KEYS = Object.keys(JOB_FRAME_SOURCES);
const JOB_FRAME_LIST = JOB_FRAME_KEYS.map((key) => JOB_FRAME_SOURCES[key]);

export const OnLoopAnimation = ({ size = 34, stepDuration = 300 }) => {
  const totalFrames = ON_FRAME_SOURCES.length;
  const getSyncedFrameIndex = () => {
    const elapsed = Date.now() - ON_ANIM_EPOCH;
    return Math.floor(elapsed / stepDuration) % totalFrames;
  };
  const [frameIndex, setFrameIndex] = useState(() => getSyncedFrameIndex());
  const intervalRef = useRef(null);
  useEffect(() => {
    setFrameIndex(getSyncedFrameIndex());
    const id = setInterval(() => setFrameIndex(getSyncedFrameIndex()), stepDuration);
    intervalRef.current = id;
    return () => clearInterval(intervalRef.current);
  }, [stepDuration]);
  return <FrameStack sources={ON_FRAME_SOURCES} activeIndex={frameIndex} width={size} height={size} />;
};

export const OffPulseAnimation = ({ size = 34 }) => {
  const epochRef = useRef(Date.now());
  const [frameIndex, setFrameIndex] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const getFrame = () => {
      const elapsed = Date.now() - epochRef.current;
      if (elapsed < OFF_INTRO_DURATION) {
        let acc = 0;
        for (let i = 0; i < OFF_INTRO_DURATIONS.length; i++) {
          acc += OFF_INTRO_DURATIONS[i];
          if (elapsed < acc) return { index: i, msToNext: acc - elapsed };
        }
      }
      const pos = (elapsed - OFF_INTRO_DURATION) % OFF_LOOP_DURATION;
      let acc = 0;
      for (let i = 0; i < OFF_LOOP_FRAMES.length; i++) {
        acc += OFF_LOOP_FRAMES[i].duration;
        if (pos < acc) return { index: OFF_LOOP_FRAMES[i].index, msToNext: acc - pos };
      }
      return { index: OFF_LOOP_FRAMES[0].index, msToNext: OFF_LOOP_FRAMES[0].duration };
    };
    const tick = () => {
      if (cancelled) return;
      const { index, msToNext } = getFrame();
      setFrameIndex(index);
      timerRef.current = setTimeout(tick, msToNext);
    };
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={OFF_FRAME_SOURCES[0]} fadeDuration={0} style={{ width: size, height: size, position: 'absolute', opacity: 0.72 }} resizeMode="contain" />
      <FrameStack sources={OFF_FRAME_SOURCES} activeIndex={frameIndex} width={size * 0.92} height={size * 0.92} />
    </View>
  );
};

export const JobPulseAnimation = ({ size = 34 }) => {
  const epochRef = useRef(Date.now());
  const [frameKey, setFrameKey] = useState(0);
  const timerRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    const getFrame = () => {
      const elapsed = Date.now() - epochRef.current;
      if (elapsed < JOB_INTRO_DURATION) {
        let acc = 0;
        for (let i = 0; i < JOB_INTRO_FRAMES.length; i++) {
          acc += JOB_INTRO_FRAMES[i].duration;
          if (elapsed < acc) return { key: JOB_INTRO_FRAMES[i].key, msToNext: acc - elapsed };
        }
      }
      const pos = (elapsed - JOB_INTRO_DURATION) % JOB_LOOP_DURATION;
      let acc = 0;
      for (let i = 0; i < JOB_LOOP_FRAMES.length; i++) {
        acc += JOB_LOOP_FRAMES[i].duration;
        if (pos < acc) return { key: JOB_LOOP_FRAMES[i].key, msToNext: acc - pos };
      }
      return { key: JOB_LOOP_FRAMES[0].key, msToNext: JOB_LOOP_FRAMES[0].duration };
    };
    const tick = () => {
      if (cancelled) return;
      const { key, msToNext } = getFrame();
      setFrameKey(key);
      timerRef.current = setTimeout(tick, msToNext);
    };
    tick();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={JOB_FRAME_SOURCES[0]} fadeDuration={0} style={{ width: size, height: size, position: 'absolute', opacity: 0.7 }} resizeMode="contain" />
      <FrameStack
        sources={JOB_FRAME_LIST}
        activeIndex={Math.max(0, JOB_FRAME_KEYS.indexOf(String(frameKey)))}
        width={size * 0.92}
        height={size * 0.92}
      />
    </View>
  );
};

export const StatusAnimation = ({ status = 'off', size = 22 }) => {
  const normalizedStatus = String(status || 'off').toLowerCase();
  if (normalizedStatus === 'on') return <OnLoopAnimation key={`on-${size}`} size={size} />;
  if (normalizedStatus === 'job') return <JobPulseAnimation key={`job-${size}`} size={size} />;
  return <OffPulseAnimation key={`off-${size}`} size={size} />;
};
