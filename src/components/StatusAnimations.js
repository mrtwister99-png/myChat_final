import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

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

// Úvodní průběh red0 -> red14 (ms na snímek)
const OFF_INTRO_DURATIONS = [350, 350, 400, 350, 400, 350, 200, 200, 200, 200, 300, 300, 350, 350, 350];

// Nekonečná smyčka na konci: red13 <-> red14
const OFF_LOOP_FRAMES = [
  { index: 13, duration: 600 },
  { index: 14, duration: 600 },
];

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

// Úvodní snímek (job0) - přehraje se jen jednou na začátku
const JOB_INTRO_FRAMES = [{ key: 0, duration: 350 }];

// Nekonečná smyčka bez job0
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

const JOB_LOOP_DURATION = JOB_LOOP_FRAMES.reduce((sum, frame) => sum + frame.duration, 0);

// Sdílený "epoch" pro synchronizaci všech instancí ON animace napříč obrazovkou.
const ON_ANIM_EPOCH = Date.now();

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

    const intervalId = setInterval(() => {
      setFrameIndex(getSyncedFrameIndex());
    }, stepDuration);

    intervalRef.current = intervalId;

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [stepDuration]);

  return (
    <Image
      source={ON_FRAME_SOURCES[frameIndex]}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
};

// Sdílený "epoch" pro synchronizaci všech instancí OFF animace napříč obrazovkou
// (stejný princip jako u ON/JOB - odstraňuje desync/blikání mezi více zobrazenými instancemi).
const OFF_ANIM_EPOCH = Date.now();
const OFF_INTRO_DURATION = OFF_INTRO_DURATIONS.reduce((sum, duration) => sum + duration, 0);
const OFF_LOOP_DURATION = OFF_LOOP_FRAMES.reduce((sum, frame) => sum + frame.duration, 0);

const getOffSyncedFrame = () => {
  const elapsed = Date.now() - OFF_ANIM_EPOCH;

  if (elapsed < OFF_INTRO_DURATION) {
    let acc = 0;
    for (let i = 0; i < OFF_INTRO_DURATIONS.length; i += 1) {
      acc += OFF_INTRO_DURATIONS[i];
      if (elapsed < acc) {
        return { index: i, msToNext: acc - elapsed };
      }
    }
  }

  const positionInLoop = (elapsed - OFF_INTRO_DURATION) % OFF_LOOP_DURATION;
  let acc = 0;
  for (let i = 0; i < OFF_LOOP_FRAMES.length; i += 1) {
    acc += OFF_LOOP_FRAMES[i].duration;
    if (positionInLoop < acc) {
      return { index: OFF_LOOP_FRAMES[i].index, msToNext: acc - positionInLoop };
    }
  }

  return { index: OFF_LOOP_FRAMES[0].index, msToNext: OFF_LOOP_FRAMES[0].duration };
};

export const OffPulseAnimation = ({ size = 34 }) => {
  const [frameIndex, setFrameIndex] = useState(() => getOffSyncedFrame().index);
  const timerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    const tick = () => {
      if (isCancelled) {
        return;
      }

      const { index, msToNext } = getOffSyncedFrame();
      setFrameIndex(index);
      timerRef.current = setTimeout(tick, msToNext);
    };

    tick();

    return () => {
      isCancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={OFF_FRAME_SOURCES[0]}
        style={{ width: size, height: size, position: 'absolute', opacity: 0.72 }}
        resizeMode="contain"
      />
      <Image
        source={OFF_FRAME_SOURCES[frameIndex]}
        style={{ width: size * 0.92, height: size * 0.92, opacity: 1 }}
        resizeMode="contain"
      />
    </View>
  );
};

// Sdílený "epoch" pro synchronizaci všech instancí JOB animace napříč obrazovkou.
const JOB_ANIM_EPOCH = Date.now();

const JOB_INTRO_DURATION = JOB_INTRO_FRAMES.reduce((sum, frame) => sum + frame.duration, 0);

const getJobSyncedFrame = () => {
  const elapsed = Date.now() - JOB_ANIM_EPOCH;

  if (elapsed < JOB_INTRO_DURATION) {
    let acc = 0;
    for (let i = 0; i < JOB_INTRO_FRAMES.length; i += 1) {
      acc += JOB_INTRO_FRAMES[i].duration;
      if (elapsed < acc) {
        return { key: JOB_INTRO_FRAMES[i].key, msToNext: acc - elapsed };
      }
    }
  }

  const positionInLoop = (elapsed - JOB_INTRO_DURATION) % JOB_LOOP_DURATION;
  let acc = 0;
  for (let i = 0; i < JOB_LOOP_FRAMES.length; i += 1) {
    acc += JOB_LOOP_FRAMES[i].duration;
    if (positionInLoop < acc) {
      return { key: JOB_LOOP_FRAMES[i].key, msToNext: acc - positionInLoop };
    }
  }

  return { key: JOB_LOOP_FRAMES[0].key, msToNext: JOB_LOOP_FRAMES[0].duration };
};

export const JobPulseAnimation = ({ size = 34 }) => {
  const [frameKey, setFrameKey] = useState(() => getJobSyncedFrame().key);
  const timerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    const tick = () => {
      if (isCancelled) {
        return;
      }

      const { key, msToNext } = getJobSyncedFrame();
      setFrameKey(key);
      timerRef.current = setTimeout(tick, msToNext);
    };

    tick();

    return () => {
      isCancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={JOB_FRAME_SOURCES[0]}
        style={{ width: size, height: size, position: 'absolute', opacity: 0.7 }}
        resizeMode="contain"
      />
      <Image
        source={JOB_FRAME_SOURCES[frameKey] || JOB_FRAME_SOURCES[0]}
        style={{ width: size * 0.92, height: size * 0.92, opacity: 1 }}
        resizeMode="contain"
      />
    </View>
  );
};

export const StatusAnimation = ({ status = 'off', size = 22 }) => {
  const normalizedStatus = String(status || 'off').toLowerCase();

  if (normalizedStatus === 'on') {
    return <OnLoopAnimation key={`on-${size}`} size={size} />;
  }

  if (normalizedStatus === 'job') {
    return <JobPulseAnimation key={`job-${size}`} size={size + 2} />;
  }

  return <OffPulseAnimation key={`off-${size}`} size={size + 3} />;
};
