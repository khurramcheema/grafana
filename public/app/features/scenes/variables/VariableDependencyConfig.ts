import { variableRegex } from 'app/features/variables/utils';

import { SceneObject, SceneObjectState, SceneVariableDependencyConfigLike } from '../core/types';

interface VariableDependencyCacheOptions<TState extends SceneObjectState> {
  /**
   * State paths to scan / extract variable dependencies from
   */
  statePaths: Array<keyof TState>;
  /**
   * Optional way to customize how to handle when a dependent variable changes
   * If not specified the default behavior is to trigger a re-render
   */
  onVariableValuesChanged?: () => void;
}

export class VariableDependencyConfig<TState extends SceneObjectState> implements SceneVariableDependencyConfigLike {
  private _state: TState | undefined;
  private _dependencies = new Set<string>();
  private _statePaths: Array<keyof TState>;

  scanCount = 0;

  constructor(private _sceneObject: SceneObject<TState>, options: VariableDependencyCacheOptions<TState>) {
    this._statePaths = options.statePaths;

    if (options.onVariableValuesChanged) {
      this.onVariableValuesChanged = options.onVariableValuesChanged;
    }
  }

  //** Default handler is just to trigger re-render by changing state */
  onVariableValuesChanged = () => {
    this._sceneObject.setState({});
  };

  getNames(): Set<string> {
    const prevState = this._state;
    const newState = (this._state = this._sceneObject.state);

    if (!prevState) {
      // First time we always scan for dependencies
      this.scanStateForDependencies(this._state);
      return this._dependencies;
    }

    // Second time we only scan if state is a different and if any specific state path has changed
    if (newState !== prevState) {
      for (const path of this._statePaths) {
        if (newState[path] !== prevState[path]) {
          this.scanStateForDependencies(newState);
          break;
        }
      }
    }

    return this._dependencies;
  }

  private scanStateForDependencies(state: TState) {
    this._dependencies.clear();
    this.scanCount += 1;

    for (const path of this._statePaths) {
      const value = state[path];
      if (value) {
        this.extractVariablesFrom(value);
      }
    }
  }

  private extractVariablesFrom(value: unknown) {
    variableRegex.lastIndex = 0;

    const stringToCheck = typeof value !== 'string' ? safeStringifyValue(value) : value;

    const matches = stringToCheck.matchAll(variableRegex);
    if (!matches) {
      return;
    }

    for (const match of matches) {
      const [, var1, var2, , var3] = match;
      const variableName = var1 || var2 || var3;
      this._dependencies.add(variableName);
    }
  }
}

const safeStringifyValue = (value: unknown) => {
  try {
    return JSON.stringify(value, null);
  } catch (error) {
    console.error(error);
  }

  return '';
};