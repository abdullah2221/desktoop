import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

describe('IconActionButton Contracts', () => {
  it('should expose tooltip position and disabled tooltip support', () => {
    const filePath = path.resolve(__dirname, '../../../renderer/shared/ui/IconActionButton.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('tooltipPosition');
    expect(content).toContain('disabledTooltip');
    expect(content).toContain('Tooltip');
  });

  it('should keep aria-label and title for accessibility', () => {
    const filePath = path.resolve(__dirname, '../../../renderer/shared/ui/IconActionButton.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('aria-label');
    expect(content).toContain('title={tooltipText}');
  });
});

