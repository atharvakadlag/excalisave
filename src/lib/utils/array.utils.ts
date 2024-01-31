type KeyedBy<T> = Record<string, T>;

export function keyBy<T>(objects: T[], key: string): KeyedBy<T> {
  return objects.reduce((result, obj: any) => {
    const keyValue = obj[key];
    result[keyValue] = obj as any;

    return result;
  }, {} as KeyedBy<T>);
}
