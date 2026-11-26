import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useI18n } from '@/src/i18n';
import { iconSize, iconStroke } from '@/src/theme';

interface BackArrowProps {
  size?: number;
  color: string;
}

/** Navigation arrow that flips in RTL layouts. */
export function BackArrow({ size = iconSize.xxl, color }: BackArrowProps) {
  const { isRTL } = useI18n();
  const Icon = isRTL ? ArrowRight : ArrowLeft;
  return <Icon size={size} color={color} strokeWidth={iconStroke.emphasis} />;
}
