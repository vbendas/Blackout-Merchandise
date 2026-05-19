import React from 'react';
import { Box, Text } from 'ink';

export function CatalogPlaceholder({ maxHeight }: { maxHeight: number }) {
  return (
    <Box flexDirection="column" height={maxHeight}>
      <Text bold color="cyan">📦 Product Catalog</Text>
      <Text dimColor>Loading...</Text>
    </Box>
  );
}
