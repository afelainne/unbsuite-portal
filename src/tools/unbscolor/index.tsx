import { LanguageProvider } from './i18n';
import App from './App';

const UnbsColorApp = () => {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
};

export default UnbsColorApp;
