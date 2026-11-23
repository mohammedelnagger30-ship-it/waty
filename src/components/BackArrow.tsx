import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useI18n } from '@/src/i18n';

interface BackArrowProps {
  size?: number;
  color: string;
}

/** Navigation arrow that flips in RTL layouts. */
export function BackArrow({ size = 24, color }: BackArrowProps) {
  const { isRTL } = useI18n();
  return isRTL ? <ArrowRight size={size} color={color} /> : <ArrowLeft size={size} color={color} />;
}
