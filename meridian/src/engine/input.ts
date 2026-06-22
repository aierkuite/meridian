export type Axis = -1 | 0 | 1;

export interface InputSnapshot {
  readonly moveX: Axis;
  readonly jump: boolean;
  readonly sunDelta: Axis;
  readonly restart: boolean;
  readonly pause: boolean;
}

export interface KeyboardInput {
  readonly sample: () => InputSnapshot;
  readonly dispose: () => void;
}

const TRACKED_CODES = new Set<string>([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "Escape",
  "KeyA",
  "KeyD",
  "KeyR",
  "Space",
]);

/**
 * 根据负向键与正向键生成离散轴输入
 *
 * @param negative 负向键是否按下
 * @param positive 正向键是否按下
 * @returns -1 表示负向，1 表示正向，0 表示静止或互相抵消
 */
function axisFromKeys(negative: boolean, positive: boolean): Axis {
  if (negative === positive) {
    return 0;
  }

  return negative ? -1 : 1;
}

/**
 * 从当前键盘状态创建不可变输入快照
 *
 * @param pressedCodes 当前处于按下状态的键盘 code 集合
 * @returns 固定步长更新使用的输入快照
 */
function createInputSnapshot(pressedCodes: ReadonlySet<string>): InputSnapshot {
  return Object.freeze({
    moveX: axisFromKeys(
      pressedCodes.has("ArrowLeft") || pressedCodes.has("KeyA"),
      pressedCodes.has("ArrowRight") || pressedCodes.has("KeyD"),
    ),
    jump: pressedCodes.has("Space"),
    sunDelta: axisFromKeys(pressedCodes.has("ArrowDown"), pressedCodes.has("ArrowUp")),
    restart: pressedCodes.has("KeyR"),
    pause: pressedCodes.has("Escape"),
  });
}

/**
 * 创建键盘输入采样器
 *
 * @param target 接收键盘事件的窗口对象
 * @returns 可在固定步长循环中采样和释放的输入控制器
 */
export function createKeyboardInput(target: Window = window): KeyboardInput {
  const pressedCodes = new Set<string>();

  /**
   * 记录被跟踪按键的按下状态
   *
   * @param event 浏览器键盘事件
   * @returns 无返回值
   */
  const handleKeyDown = (event: KeyboardEvent): void => {
    if (!TRACKED_CODES.has(event.code)) {
      return;
    }

    event.preventDefault();
    pressedCodes.add(event.code);
  };

  /**
   * 清除被跟踪按键的按下状态
   *
   * @param event 浏览器键盘事件
   * @returns 无返回值
   */
  const handleKeyUp = (event: KeyboardEvent): void => {
    if (!TRACKED_CODES.has(event.code)) {
      return;
    }

    event.preventDefault();
    pressedCodes.delete(event.code);
  };

  target.addEventListener("keydown", handleKeyDown);
  target.addEventListener("keyup", handleKeyUp);

  return {
    sample: () => createInputSnapshot(pressedCodes),
    dispose: () => {
      target.removeEventListener("keydown", handleKeyDown);
      target.removeEventListener("keyup", handleKeyUp);
      pressedCodes.clear();
    },
  };
}
