import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';

const SPIN_DURATION = 3000;

const isSpinningIcon = (iconKey) => String(iconKey || '').trim().toLowerCase() === 'admin1';

export const AvatarIcon = ({ source, iconKey, style, resizeMode = 'contain' }) => {
  const spin = isSpinningIcon(iconKey);
  const rotation = useRef(new Animated.Value(0)).current;
  const loopRef = useRef(null);

  useEffect(() => {
    if (!spin) {
      rotation.setValue(0);
      return undefined;
    }

    rotation.setValue(0);
    loopRef.current = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: SPIN_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loopRef.current.start();

    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
      }
    };
  }, [spin]);

  if (!spin) {
    return <Image source={source} style={style} resizeMode={resizeMode} />;
  }

  return (
    <Animated.Image
      source={source}
      style={[
        style,
        {
          transform: [
            {
              rotate: rotation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '-360deg'],
              }),
            },
          ],
        },
      ]}
      resizeMode={resizeMode}
    />
  );
};
