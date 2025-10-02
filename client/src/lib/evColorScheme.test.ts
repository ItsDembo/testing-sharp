import { evColorClass } from './evColorScheme';

describe('EV Color Scheme', () => {
  test('should return red for values less than 1%', () => {
    expect(evColorClass(0.99)).toBe('text-red-500');
    expect(evColorClass(0.5)).toBe('text-red-500');
    expect(evColorClass(0)).toBe('text-red-500');
    expect(evColorClass(-1)).toBe('text-red-500');
  });

  test('should return orange for values 1% to less than 2%', () => {
    expect(evColorClass(1.00)).toBe('text-orange-500');
    expect(evColorClass(1.5)).toBe('text-orange-500');
    expect(evColorClass(1.99)).toBe('text-orange-500');
  });

  test('should return yellow for values 2% to less than 3%', () => {
    expect(evColorClass(2.00)).toBe('text-yellow-500');
    expect(evColorClass(2.5)).toBe('text-yellow-500');
    expect(evColorClass(2.99)).toBe('text-yellow-500');
  });

  test('should return green for values 3% and above', () => {
    expect(evColorClass(3.00)).toBe('text-green-500');
    expect(evColorClass(5)).toBe('text-green-500');
    expect(evColorClass(10)).toBe('text-green-500');
  });

  test('should handle edge cases correctly', () => {
    expect(evColorClass(0.999)).toBe('text-red-500');
    expect(evColorClass(1.999)).toBe('text-orange-500');
    expect(evColorClass(2.999)).toBe('text-yellow-500');
    expect(evColorClass(3.001)).toBe('text-green-500');
  });
});
