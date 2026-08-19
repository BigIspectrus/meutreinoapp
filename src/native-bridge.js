import { Capacitor, registerPlugin } from '@capacitor/core';

const Native = registerPlugin('TreinoNative');
const native = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

function call(method, payload = {}) {
  if (!native()) return Promise.resolve({ native: false, available: false });
  return Native[method](payload);
}

window.TreinoNativeBridge = {
  isNative: native,
  getNativeInfo: () => call('getNativeInfo'),
  getNativeStorageInfo: () => call('getNativeStorageInfo'),
  openUrl: url => call('openUrl', { url }),
  requestCorePermissions: () => call('requestCorePermissions'),
  getWorkoutState: () => call('getWorkoutState'),
  startWorkout: data => call('startWorkout', data),
  updateWorkout: data => call('updateWorkout', data),
  pauseWorkout: () => call('pauseWorkout'),
  resumeWorkout: () => call('resumeWorkout'),
  finishWorkout: data => call('finishWorkout', data || {}),
  startRest: data => call('startRest', data),
  adjustRest: deltaSeconds => call('adjustRest', { deltaSeconds }),
  skipRest: () => call('skipRest'),
  updateWidgetState: data => call('updateWidgetState', data),
  saveTextFile: data => call('saveTextFile', data || {}),
  saveBase64File: data => call('saveBase64File', data || {}),
  shareTextFile: data => call('shareTextFile', data || {}),
  saveImageToGallery: data => call('saveImageToGallery', data || {}),
  shareImage: data => call('shareImage', data || {}),
  getHealthStatus: () => call('getHealthStatus'),
  getRecoverySnapshot: data => call('getRecoverySnapshot', data || {}),
  requestHealthPermissions: () => call('requestHealthPermissions'),
  getHealthSyncResults: () => call('getHealthSyncResults'),
  listHealthExercises: data => call('listHealthExercises', data || {}),
  getHealthExerciseDetail: data => call('getHealthExerciseDetail', data || {}),
  probeHealthConnect: () => call('probeHealthConnect'),
  saveHealthLink: data => call('saveHealthLink', data || {}),
  findHealthMatch: data => call('findHealthMatch', data),
  writeHealthSession: data => call('writeHealthSession', data),
  syncWeight: data => call('syncWeight', data),
  syncNativeDatabase: data => call('syncNativeDatabase', data),
  saveWorkoutMirror: data => call('saveWorkoutMirror', data),
};
