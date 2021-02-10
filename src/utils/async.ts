/* eslint-disable @typescript-eslint/no-explicit-any */
type asyncFn = <V>(...args: any[]) => Promise<V> | V | Promise<void> | void;

export const serialExec = async <T>(tasks: any[], fn: asyncFn): Promise<T[]> =>
  tasks.reduce(async (promise, task) => {
    const result = await promise;
    const taskResult = await fn<T>(task);
    return [...result, taskResult];
  }, []);
