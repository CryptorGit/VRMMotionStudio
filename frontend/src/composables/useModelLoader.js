import { useModelOperations } from './useModelOperations.js';
import { usePoseControls } from './usePoseControls.js';

export function useModelLoader() {
  return {
    ...useModelOperations(),
    ...usePoseControls(),
  };
}
