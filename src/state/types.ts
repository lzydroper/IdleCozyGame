import type { GameState } from '../types/game';

// 领域更新函数统一返回形态：更新后的状态 + 调用方需要的返回值
export interface UpdateResult<T> {
  state: GameState;
  result: T;
}

export const NO_OP = (state: GameState): UpdateResult<false> => ({ state, result: false });
