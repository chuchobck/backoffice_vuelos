import { Moon, Sun } from 'lucide-react';
import { es } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { useTheme } from '../providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={dark ? es.a11y.themeToLight : es.a11y.themeToDark} className="text-primary-foreground hover:bg-primary-hover">
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}
