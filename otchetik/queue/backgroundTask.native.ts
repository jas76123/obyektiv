import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { runQueueNow } from './triggers';

export const TASK_NAME = 'otchetik-upload-queue';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const r = await runQueueNow();
    return r.failed > 0 ? BackgroundTask.BackgroundTaskResult.Failed : BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/** Страховка поверх триггеров: система запустит не раньше чем через 15 минут и когда сама решит. */
export async function registerBackgroundTask(): Promise<void> {
  const status = await BackgroundTask.getStatusAsync();
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
  const already = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!already) await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
}
