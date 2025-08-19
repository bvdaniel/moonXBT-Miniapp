export const computeMissingRequired = (
  requiredIds: string[],
  snapshotTasks: Record<string, { completed?: boolean } | undefined> | undefined,
  currentBalance: string | null,
  minA0xRequired: number
): string[] => {
  const missing: string[] = [];
  for (const id of requiredIds) {
    if (id === "hold-a0x") {
      const hasRequired = currentBalance !== null && Number(currentBalance) >= minA0xRequired;
      if (!hasRequired) missing.push(id);
      continue;
    }
    const completed = snapshotTasks?.[id]?.completed === true;
    if (!completed) missing.push(id);
  }
  return missing;
};

