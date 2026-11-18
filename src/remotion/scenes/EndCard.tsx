import { endCardBeats, type EndCardProps } from '../../video/scenes/endCard.ts';
import { useFontsReady } from '../lib/fonts.ts';
import { BrandLockup } from '../brand/Lockup.tsx';

/**
 * Scene type "endCard" / BrandOutroScene (model: src/video/scenes/endCard.ts). The brand
 * lockup (BrandLockup), then stillness: readable, and it loops cleanly.
 */
export const EndCard: React.FC<{ props: EndCardProps; duration: number }> = ({ props, duration }) => {
  useFontsReady();
  return <BrandLockup beats={endCardBeats(props)} cta={props.cta} switchHandedOver={props.switchHandedOver} burst={props.burst} smooth={props.smooth} duration={duration} disclosure={props.disclosure} />;
};
