// src/components/CropBox.tsx
import React, {useImperativeHandle, forwardRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

export type CropRect = {x: number; y: number; width: number; height: number};

export type CropBoxHandle = {
  getCropRect: () => CropRect;
};

type Props = {
  containerWidth: number;
  containerHeight: number;
  isSquare: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

const MIN_SIZE = 60;
const HANDLE_SIZE = 28;

export const CropBox = forwardRef<CropBoxHandle, Props>(
  ({containerWidth, containerHeight, isSquare, onDragStart, onDragEnd}, ref) => {
    const initialSize = Math.min(containerWidth, containerHeight) * 0.8;
    const initialX = (containerWidth - initialSize) / 2;
    const initialY = (containerHeight - initialSize) / 2;

    const x = useSharedValue(initialX);
    const y = useSharedValue(initialY);
    const w = useSharedValue(initialSize);
    const h = useSharedValue(initialSize);
    const showGrid = useSharedValue(0);

    // Track previous translation to compute per-frame deltas
    const prevMoveX = useSharedValue(0);
    const prevMoveY = useSharedValue(0);
    const prevCornerX = useSharedValue(0);
    const prevCornerY = useSharedValue(0);

    useImperativeHandle(ref, () => ({
      getCropRect: () => ({
        x: x.value,
        y: y.value,
        width: w.value,
        height: h.value,
      }),
    }));

    function clamp(value: number, min: number, max: number) {
      'worklet';
      return Math.min(Math.max(value, min), max);
    }

    const moveGesture = Gesture.Pan()
      .onStart(() => {
        prevMoveX.value = 0;
        prevMoveY.value = 0;
        showGrid.value = withTiming(1, {duration: 100});
        if (onDragStart) runOnJS(onDragStart)();
      })
      .onUpdate(e => {
        const dx = e.translationX - prevMoveX.value;
        const dy = e.translationY - prevMoveY.value;
        prevMoveX.value = e.translationX;
        prevMoveY.value = e.translationY;
        x.value = clamp(x.value + dx, 0, containerWidth - w.value);
        y.value = clamp(y.value + dy, 0, containerHeight - h.value);
      })
      .onEnd(() => {
        showGrid.value = withTiming(0, {duration: 300});
        if (onDragEnd) runOnJS(onDragEnd)();
      });

    function makeCornerGesture(corner: 'tl' | 'tr' | 'bl' | 'br') {
      return Gesture.Pan()
        .onStart(() => {
          prevCornerX.value = 0;
          prevCornerY.value = 0;
          showGrid.value = withTiming(1, {duration: 100});
          if (onDragStart) runOnJS(onDragStart)();
        })
        .onUpdate(e => {
          const dx = e.translationX - prevCornerX.value;
          const dy = e.translationY - prevCornerY.value;
          prevCornerX.value = e.translationX;
          prevCornerY.value = e.translationY;
          if (corner === 'tl') {
            const newW = clamp(w.value - dx, MIN_SIZE, x.value + w.value);
            const newH = isSquare ? newW : clamp(h.value - dy, MIN_SIZE, y.value + h.value);
            x.value = clamp(x.value + (w.value - newW), 0, containerWidth - MIN_SIZE);
            y.value = clamp(y.value + (h.value - newH), 0, containerHeight - MIN_SIZE);
            w.value = newW;
            h.value = newH;
          } else if (corner === 'tr') {
            const newW = clamp(w.value + dx, MIN_SIZE, containerWidth - x.value);
            const newH = isSquare ? newW : clamp(h.value - dy, MIN_SIZE, y.value + h.value);
            y.value = clamp(y.value + (h.value - newH), 0, containerHeight - MIN_SIZE);
            w.value = newW;
            h.value = newH;
          } else if (corner === 'bl') {
            const newW = clamp(w.value - dx, MIN_SIZE, x.value + w.value);
            const newH = isSquare ? newW : clamp(h.value + dy, MIN_SIZE, containerHeight - y.value);
            x.value = clamp(x.value + (w.value - newW), 0, containerWidth - MIN_SIZE);
            w.value = newW;
            h.value = newH;
          } else {
            // br
            const newW = clamp(w.value + dx, MIN_SIZE, containerWidth - x.value);
            const newH = isSquare ? newW : clamp(h.value + dy, MIN_SIZE, containerHeight - y.value);
            w.value = newW;
            h.value = newH;
          }
        })
        .onEnd(() => {
          showGrid.value = withTiming(0, {duration: 300});
          if (onDragEnd) runOnJS(onDragEnd)();
        });
    }

    const boxStyle = useAnimatedStyle(() => ({
      position: 'absolute',
      left: x.value,
      top: y.value,
      width: w.value,
      height: h.value,
    }));

    const gridStyle = useAnimatedStyle(() => ({opacity: showGrid.value}));

    return (
      <>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="none" />

        <Animated.View style={boxStyle}>
          <GestureDetector gesture={moveGesture}>
            <Animated.View style={styles.cropWindow}>
              <Animated.View style={[StyleSheet.absoluteFill, gridStyle]} pointerEvents="none">
                <View style={[styles.gridLine, styles.gridH, {top: '33%'}]} />
                <View style={[styles.gridLine, styles.gridH, {top: '66%'}]} />
                <View style={[styles.gridLine, styles.gridV, {left: '33%'}]} />
                <View style={[styles.gridLine, styles.gridV, {left: '66%'}]} />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          <View style={[StyleSheet.absoluteFill, styles.border]} pointerEvents="none" />

          {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
            <GestureDetector key={corner} gesture={makeCornerGesture(corner)}>
              <View style={[styles.handle, styles[corner as keyof typeof styles]]} />
            </GestureDetector>
          ))}
        </Animated.View>
      </>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {backgroundColor: 'rgba(0,0,0,0.5)'},
  cropWindow: {flex: 1},
  border: {borderWidth: 1.5, borderColor: '#fff'},
  gridLine: {position: 'absolute', backgroundColor: 'rgba(255,255,255,0.35)'},
  gridH: {left: 0, right: 0, height: 1},
  gridV: {top: 0, bottom: 0, width: 1},
  handle: {position: 'absolute', width: HANDLE_SIZE, height: HANDLE_SIZE},
  tl: {top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#fff'},
  tr: {top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#fff'},
  bl: {bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#fff'},
  br: {bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#fff'},
});
