export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (leftNorm === 0 || rightNorm === 0) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function rankVectors<T extends { embedding: number[] }>(
  records: T[],
  query: number[],
  limit: number,
): Array<{ item: T; similarity: number }> {
  return records
    .map(item => ({ item, similarity: cosineSimilarity(query, item.embedding) }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, Math.max(0, limit));
}
