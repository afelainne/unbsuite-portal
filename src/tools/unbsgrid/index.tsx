import Index from './pages/Index';
import { LanguageProvider } from './i18n';

const UnbsGridApp = () => {
  return (
    <LanguageProvider>
      <Index />
    </LanguageProvider>
  );
};

export default UnbsGridApp;
