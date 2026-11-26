import { useEffect, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';

/**
 * Keyboard height in dp, including a fallback for devices where the window is
 * not adjusted for the IME (seen on Samsung tablets: keyboardDidShow reports 0
 * while the keyboard covers the bottom of the screen).
 */
export function useKeyboardInset(): number {
  const { height } = useWindowDimensions();
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const fallback = Math.min(560, Math.round(height * 0.44));
    const onShow = (event: { endCoordinates?: { height?: number } }) => {
      const reported = event?.endCoordinates?.height ?? 0;
      setInset(reported > 40 ? reported : fallback);
    };
    const onHide = () => setInset(0);
    const showSub = Keyboard.addListener('keyboardDidShow', onShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [height]);

  return inset;
}
