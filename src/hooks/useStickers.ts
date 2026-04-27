import {useContext} from 'react';
import {StickersContext} from '../context/StickersContext';

export function useStickers() {
  return useContext(StickersContext);
}
