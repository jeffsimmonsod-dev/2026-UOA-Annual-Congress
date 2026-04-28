'use strict';

// Web stub for react-native-worklets.
// On web, there is no JSI/native worklet runtime. This stub provides no-op
// implementations so that react-native-reanimated can load without crashing.

export const RuntimeKind = {
  ReactNative: 1,
  UI: 2,
  Worker: 3,
};

export function getRuntimeKind() {
  return RuntimeKind.ReactNative;
}

export function isWorkletFunction(value) {
  return typeof value === 'function' && !!value.__workletHash;
}

export function runOnUI(fn) {
  return function (...args) {
    fn(...args);
  };
}

export function runOnUISync(fn) {
  return function (...args) {
    return fn(...args);
  };
}

export function runOnUIAsync(fn) {
  return function (...args) {
    return Promise.resolve(fn(...args));
  };
}

export function runOnJS(fn) {
  return function (...args) {
    fn(...args);
  };
}

export function executeOnUIRuntimeSync(fn) {
  return function (...args) {
    return fn(...args);
  };
}

export function scheduleOnUI(fn, ...args) {
  fn(...args);
}

export function scheduleOnRN(fn, ...args) {
  fn(...args);
}

export function unstable_eventLoopTask(fn) {
  return fn;
}

export function callMicrotasks() {}

export function setupMicrotasks() {}

export function createWorkletRuntime() {
  return null;
}

export function runOnRuntime(runtime, fn) {
  return function (...args) {
    fn(...args);
  };
}

export function makeShareable(value) {
  return value;
}

export function makeShareableCloneRecursive(value) {
  return value;
}

export function makeShareableCloneOnUIRecursive(value) {
  return value;
}

export function isShareableRef() {
  return false;
}

export const shareableMappingCache = {
  set() {},
  get() { return undefined; },
  has() { return false; },
};

export function createSerializable(value) {
  return value;
}

export function isSerializableRef() {
  return false;
}

export const serializableMappingCache = {
  set() {},
  get() { return undefined; },
  has() { return false; },
};

export function createSynchronizable(value) {
  return value;
}

export function isSynchronizable() {
  return false;
}

export function getStaticFeatureFlag() {
  return false;
}

export function setDynamicFeatureFlag() {}

export const WorkletsModule = {
  makeShareableClone() { return null; },
  scheduleOnUI() {},
  executeOnUIRuntimeSync() {},
  createWorkletRuntime() { return null; },
  scheduleOnRuntime() {},
};
