import { LabIcon } from '@jupyterlab/ui-components';
import WandIconStr from '../style/icons/wand-icon.svg';
import SpinnerIconStr from '../style/icons/spinner-icon.svg';
import ThumbUpStr from '../style/icons/thumb-up.svg';
import ThumbDownStr from '../style/icons/thumb-down.svg';
import FeedbackIconStr from '../style/icons/feedback-icon.svg';

export const wandIcon = new LabIcon({
  name: 'want:Icon',
  svgstr: WandIconStr
});

export const spinnerIcon = new LabIcon({
  name: 'spinner:Icon',
  svgstr: SpinnerIconStr
});

export const thumbUpIcon = new LabIcon({
  name: 'thumbUp:Icon',
  svgstr: ThumbUpStr
});

export const thumbDownIcon = new LabIcon({
  name: 'thumbDown:Icon',
  svgstr: ThumbDownStr
});

export const feedbackIcon = new LabIcon({
  name: 'feedback:Icon',
  svgstr: FeedbackIconStr
});
