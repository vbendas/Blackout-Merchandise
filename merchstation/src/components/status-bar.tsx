import React, { memo } from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../lib/store';

export const StatusBar = memo(function StatusBar() {
  const dbConnected = useAppStore((s) => s.dbConnected);
  const statusMessage = useAppStore((s) => s.statusMessage);
  const focusMode = useAppStore((s) => s.focusMode);

  const now = new Date();
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Box justifyContent="space-between" paddingX={1}>
      <Text>
        <Text color={dbConnected ? 'green' : 'red'}>
          {dbConnected ? '●' : '○'}
        </Text>
        <Text> DB {dbConnected ? 'Connected' : 'Disconnected'}</Text>
      </Text>
      <Text>
        {focusMode === 'sidebar' ? (
          <Text color="cyan">[NAV]</Text>
        ) : (
          <Text dimColor>[CONTENT]</Text>
        )}
      </Text>
      <Text dimColor>{statusMessage}</Text>
      <Text dimColor>{time}</Text>
    </Box>
  );
});
