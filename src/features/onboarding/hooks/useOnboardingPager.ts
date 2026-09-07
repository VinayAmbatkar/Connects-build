import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';

const SWIPE_THRESHOLD = 0.18;

type Options = {
  totalSteps: number;
  initialStep?: number;
};

export function useOnboardingPager({ totalSteps, initialStep = 0 }: Options) {
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(initialStep);
  const stepRef = useRef(initialStep);
  const translateX = useRef(new Animated.Value(-initialStep * width)).current;
  const dragOffset = useRef(-initialStep * width);

  const snapTo = useCallback(
    (index: number, velocity = 0) => {
      const clamped = Math.max(0, Math.min(totalSteps - 1, index));
      stepRef.current = clamped;
      setStep(clamped);
      dragOffset.current = -clamped * width;

      Animated.spring(translateX, {
        toValue: dragOffset.current,
        useNativeDriver: true,
        velocity,
        tension: 64,
        friction: 12,
      }).start();
    },
    [totalSteps, translateX, width],
  );

  const next = useCallback(() => snapTo(stepRef.current + 1), [snapTo]);
  const prev = useCallback(() => snapTo(stepRef.current - 1), [snapTo]);

  useEffect(() => {
    const x = -stepRef.current * width;
    dragOffset.current = x;
    translateX.setValue(x);
  }, [translateX, width]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.15,
        onPanResponderGrant: () => {
          translateX.stopAnimation((value) => {
            dragOffset.current = value;
          });
        },
        onPanResponderMove: (_, gesture) => {
          let nextX = dragOffset.current + gesture.dx;
          const minX = -(totalSteps - 1) * width;
          const maxX = 0;

          if (nextX > maxX) nextX = maxX + (nextX - maxX) * 0.3;
          if (nextX < minX) nextX = minX + (nextX - minX) * 0.3;

          translateX.setValue(nextX);
        },
        onPanResponderRelease: (_, gesture) => {
          const projectedX = dragOffset.current + gesture.dx;
          let target = stepRef.current;

          if (gesture.dx < -width * SWIPE_THRESHOLD || gesture.vx < -0.35) {
            target = stepRef.current + 1;
          } else if (gesture.dx > width * SWIPE_THRESHOLD || gesture.vx > 0.35) {
            target = stepRef.current - 1;
          } else {
            target = Math.round(-projectedX / width);
          }

          snapTo(target, gesture.vx);
        },
      }),
    [snapTo, totalSteps, translateX, width],
  );

  return {
    step,
    next,
    prev,
    snapTo,
    translateX,
    panHandlers: panResponder.panHandlers,
    width,
    height,
  };
}
